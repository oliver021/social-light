using Microsoft.Extensions.DependencyInjection;

namespace Profile.FunctionalTests;

/// <summary>
/// End-to-end HTTP tests for Profile.API: auth-gated routing, the create-on-first-edit
/// upsert, and ownership coming from the principal (never the body).
/// </summary>
public sealed class ProfileApiTests(ProfileApiFixture fixture) : IClassFixture<ProfileApiFixture>
{
    private const string BasePath = "/api/profiles";
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    private HttpClient CreateClient()
        => fixture.CreateDefaultClient(new ApiVersionHandler(new QueryStringApiVersionWriter(), new ApiVersion(1, 0)));

    [Fact]
    public async Task Edit_me_creates_then_updates_and_get_me_roundtrips()
    {
        var client = CreateClient();

        var create = await client.PutAsJsonAsync($"{BasePath}/me",
            new UpdateProfileRequest("Test User", "first bio", null, "Earth", "tester"),
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, create.StatusCode);

        var created = await create.Content.ReadFromJsonAsync<ProfileDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);
        // Ownership is bound from the JWT sub, not the request body.
        Assert.Equal(TestAuthHandler.UserId, created!.UserId);
        Assert.Equal("Test User", created.DisplayName);

        // A second edit updates the same profile (upsert, not a duplicate).
        var update = await client.PutAsJsonAsync($"{BasePath}/me",
            new UpdateProfileRequest("Test User", "updated bio", null, "Mars", "tester"),
            TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        var mine = await client.GetFromJsonAsync<ProfileDto>($"{BasePath}/me", _json, TestContext.Current.CancellationToken);
        Assert.NotNull(mine);
        Assert.Equal("updated bio", mine!.Bio);
        Assert.Equal("Mars", mine.Location);
    }

    [Fact]
    public async Task Get_by_user_id_returns_the_created_profile()
    {
        var client = CreateClient();
        await client.PutAsJsonAsync($"{BasePath}/me",
            new UpdateProfileRequest("By Id", null, null, null, null),
            TestContext.Current.CancellationToken);

        var byId = await client.GetAsync($"{BasePath}/{TestAuthHandler.UserId}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, byId.StatusCode);

        var profile = await byId.Content.ReadFromJsonAsync<ProfileDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(profile);
        Assert.Equal(TestAuthHandler.UserId, profile!.UserId);
    }

    [Fact]
    public async Task Get_unknown_user_returns_404()
    {
        var client = CreateClient();

        var response = await client.GetAsync($"{BasePath}/{Guid.NewGuid()}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
