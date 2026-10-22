namespace SocialLight.AcceptanceTests;

/// <summary>
/// Deterministic OpenAPI spec capture for the TypeScript SDK. Boots the real
/// SocialLight.AppHost (same proven path as the acceptance gate), waits for every
/// service healthy, then writes each service's <c>/openapi/v1.json</c> to
/// <c>clients/typescript/specs/&lt;name&gt;.json</c>. The TS generator
/// (clients/typescript/generate.mjs) renders types from those files — no live host
/// at generation time, the no-inference thesis carried to the client edge.
///
/// Run on demand (it needs Docker and ~40s): it is the bridge that turns the running
/// backend into committed spec files.
/// </summary>
public sealed class OpenApiSpecDumpTests
{
    private static readonly TimeSpan Ready = TimeSpan.FromMinutes(5);

    // resource name -> SDK service name (matches clients/typescript/services.json).
    private static readonly (string Resource, string Sdk)[] Services =
    [
        ("profile-api", "profile"),
        ("feed-api", "feed"),
        ("posts-api", "posts"),
        ("engagement-api", "engagement"),
        ("socialgraph-api", "social-graph"),
        ("stories-api", "stories"),
        ("groups-api", "groups"),
        ("events-api", "events"),
        ("reels-api", "reels"),
        ("organizations-api", "organizations"),
        ("chat-api", "chat"),
        ("notifications-api", "notifications"),
        // Marketplace module (eShop store reused as content). Ordering/Basket can't
        // emit a spec host-free (infra-coupled), so this live dump is how their typed
        // clients are generated — same deterministic path as the social modules.
        ("catalog-api", "catalog"),
        ("ordering-api", "ordering"),
        ("basket-api", "basket"),
    ];

    [Fact]
    public async Task Dump_openapi_specs_for_the_typescript_sdk()
    {
        var ct = TestContext.Current.CancellationToken;

        Environment.SetEnvironmentVariable("ASPIRE_ALLOW_UNSECURED_TRANSPORT", "true");
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");
        Environment.SetEnvironmentVariable("DOTNET_ENVIRONMENT", "Development");

        var appHost = await DistributedApplicationTestingBuilder.CreateAsync<Projects.SocialLight_AppHost>(ct);
        await using var app = await appHost.BuildAsync(ct);
        await app.StartAsync(ct);

        // clients/typescript/specs (repo-root-relative; the test runs from its bin dir).
        var specsDir = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory,
            "..", "..", "..", "..", "..", "clients", "typescript", "specs"));
        Directory.CreateDirectory(specsDir);

        foreach (var (resource, sdk) in Services)
        {
            await app.ResourceNotifications.WaitForResourceHealthyAsync(resource, ct).WaitAsync(Ready, ct);

            using var client = app.CreateHttpClient(resource);
            var json = await RetryGetAsync(client, "/openapi/v1.json", ct);
            await File.WriteAllTextAsync(Path.Combine(specsDir, $"{sdk}.json"), json, ct);
        }
    }

    private static async Task<string> RetryGetAsync(HttpClient client, string path, CancellationToken ct)
    {
        for (var attempt = 0; attempt < 20; attempt++)
        {
            try
            {
                var response = await client.GetAsync(path, ct);
                if (response.IsSuccessStatusCode)
                {
                    return await response.Content.ReadAsStringAsync(ct);
                }
            }
            catch (HttpRequestException)
            {
                // server not accepting yet — fall through to delay + retry
            }
            await Task.Delay(TimeSpan.FromSeconds(2), ct);
        }
        throw new InvalidOperationException($"Could not fetch {path} after warmup retries.");
    }
}
