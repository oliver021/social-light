namespace SocialLight.AcceptanceTests;

/// <summary>
/// The locked acceptance gate (memory: project-acceptance-gate). Boots the real
/// SocialLight.AppHost — Identity, the generated modules, the hand-written Profile
/// and Feed, and the social-bff gateway, on real Postgres/RabbitMQ containers — and
/// drives three users through signup → login → profile edit → post → comment,
/// entirely over HTTP through the gateway's single origin. No in-process host, no DB
/// seeding. Requires Docker.
/// </summary>
public sealed class ThreeUserJourneyTests
{
    private static readonly TimeSpan Ready = TimeSpan.FromMinutes(5);

    private sealed record User(string Handle, string Email, string Password, string DisplayName);

    private static readonly User[] Users =
    [
        new("alice", "alice@social.test", "Pass123$!", "Alice Anderson"),
        new("bob", "bob@social.test", "Pass123$!", "Bob Brown"),
        new("carol", "carol@social.test", "Pass123$!", "Carol Clark"),
    ];

    [Fact]
    public async Task Three_users_signup_login_edit_profile_post_and_comment()
    {
        var ct = TestContext.Current.CancellationToken;

        // Boot cert-free, like the `http` launch profile (no dev certs); /health is
        // only mapped in Development.
        Environment.SetEnvironmentVariable("ASPIRE_ALLOW_UNSECURED_TRANSPORT", "true");
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");
        Environment.SetEnvironmentVariable("DOTNET_ENVIRONMENT", "Development");

        var appHost = await DistributedApplicationTestingBuilder.CreateAsync<Projects.SocialLight_AppHost>(ct);
        await using var app = await appHost.BuildAsync(ct);
        await app.StartAsync(ct);

        foreach (var resource in new[] { "identity-api", "profile-api", "posts-api", "engagement-api" })
        {
            await app.ResourceNotifications.WaitForResourceHealthyAsync(resource, ct).WaitAsync(Ready, ct);
        }
        await app.ResourceNotifications.WaitForResourceAsync("social-bff", KnownResourceStates.Running, ct).WaitAsync(Ready, ct);

        // 1. Each user signs up, logs in (token via the gateway), and edits their profile.
        var tokens = new Dictionary<string, string>();
        foreach (var user in Users)
        {
            await SignUpAsync(app, user, ct);
            tokens[user.Handle] = await LogInAsync(app, user, ct);

            using var client = Authenticated(app, tokens[user.Handle]);
            var profile = await RetryAsync(() => client.PutAsJsonAsync("/api/profiles/me",
                new { user.DisplayName, Bio = $"Hi, I'm {user.DisplayName}." }, ct), ct);
            Assert.Equal(HttpStatusCode.OK, profile.StatusCode);
        }

        // 2. Alice publishes a post (authorId bound from her token, not the body).
        Guid postId;
        using (var alice = Authenticated(app, tokens["alice"]))
        {
            var create = await RetryAsync(() => alice.PostAsJsonAsync("/api/posts",
                new { ContentType = "text", Visibility = "public", Status = "published", Body = "Hello socialLight!" }, ct), ct);
            Assert.Equal(HttpStatusCode.Created, create.StatusCode);
            var created = await create.Content.ReadFromJsonAsync<JsonElement>(ct);
            postId = created.GetProperty("id").GetGuid();
        }

        // 3. Bob comments on Alice's post (polymorphic engagement: targetType=Post).
        using (var bob = Authenticated(app, tokens["bob"]))
        {
            var comment = await RetryAsync(() => bob.PostAsJsonAsync("/api/comments",
                new { TargetType = "Post", TargetId = postId, Body = "Welcome, Alice!" }, ct), ct);
            Assert.Equal(HttpStatusCode.Created, comment.StatusCode);
        }
    }

    private static HttpClient Authenticated(DistributedApplication app, string token)
    {
        var client = app.CreateHttpClient("social-bff");
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        return client;
    }

    private static async Task SignUpAsync(DistributedApplication app, User user, CancellationToken ct)
    {
        using var client = app.CreateHttpClient("social-bff");
        var response = await RetryAsync(() => client.PostAsJsonAsync("/api/account/register",
            new { user.Email, user.Password, user.DisplayName }, ct), ct);
        Assert.True(
            response.StatusCode is HttpStatusCode.OK or HttpStatusCode.Created or HttpStatusCode.Conflict,
            $"Signup for {user.Email} returned {(int)response.StatusCode}.");
    }

    private static async Task<string> LogInAsync(DistributedApplication app, User user, CancellationToken ct)
    {
        using var client = app.CreateHttpClient("social-bff");
        var response = await RetryAsync(() => client.PostAsync("/connect/token", new FormUrlEncodedContent(
            new Dictionary<string, string>
            {
                ["grant_type"] = "password",
                ["client_id"] = "social-tests",
                ["client_secret"] = "secret",
                ["username"] = user.Email,
                ["password"] = user.Password,
                ["scope"] = "openid profile socialapi offline_access",
            }), ct), ct);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var token = await response.Content.ReadFromJsonAsync<JsonElement>(ct);
        return token.GetProperty("access_token").GetString()!;
    }

    /// <summary>
    /// Retries an HTTP call through the cold-boot warmup window: a freshly started
    /// service can report healthy (server reachable) a moment before its database
    /// migration/EnsureCreated finishes, briefly returning 5xx. Real clients retry
    /// transient startup errors the same way.
    /// </summary>
    private static async Task<HttpResponseMessage> RetryAsync(Func<Task<HttpResponseMessage>> send, CancellationToken ct)
    {
        HttpResponseMessage response = null!;
        for (var attempt = 0; attempt < 20; attempt++)
        {
            try
            {
                response = await send();
                if ((int)response.StatusCode < 500)
                {
                    return response;
                }
            }
            catch (HttpRequestException)
            {
                // connection not accepting yet — fall through to the delay and retry
            }
            await Task.Delay(TimeSpan.FromSeconds(2), ct);
        }
        return response;
    }
}
