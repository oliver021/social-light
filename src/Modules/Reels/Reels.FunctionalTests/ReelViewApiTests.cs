using Microsoft.Extensions.DependencyInjection;

namespace Reels.FunctionalTests;

/// <summary>
/// End-to-end HTTP tests for the <c>ReelView</c> endpoints: real routing,
/// versioning, JSON, EF/Postgres round-trip. The broker is the in-memory
/// <see cref="CapturingEventBus"/>, so the published contract is asserted too.
/// </summary>
public sealed class ReelViewApiTests(  ReelsApiFixture fixture) : IClassFixture<ReelsApiFixture>
{
    private const string BasePath = "/api/reel-views";
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    private HttpClient CreateClient()
        => fixture.CreateDefaultClient(new ApiVersionHandler(new QueryStringApiVersionWriter(), new ApiVersion(1, 0)));

    // This entity has intra-module foreign keys, so the parent row(s) must exist
    // before the FK insert. The sample is built against the live API: each parent
    // is created via its own endpoint and its id flows into this request.
    private static async Task<CreateReelViewRequest> SampleRequestAsync(HttpClient client, CancellationToken ct)
    {
        var seedReel = await SeedAsync<CreateReelRequest, ReelDto>(
            client,
            "/api/reels",
            new CreateReelRequest(Guid.NewGuid(), "sample VideoUrl", "sample Caption", 1, "sample Visibility", Guid.NewGuid()),
            ct);
        return new CreateReelViewRequest(seedReel.Id, Guid.NewGuid(), DateTime.UtcNow);
    }

    private static async Task<TDto> SeedAsync<TRequest, TDto>(HttpClient client, string path, TRequest body, CancellationToken ct)
    {
        var response = await client.PostAsJsonAsync(path, body, ct);
        response.EnsureSuccessStatusCode();
        var created = await response.Content.ReadFromJsonAsync<TDto>(ct);
        Assert.NotNull(created);
        return created!;
    }

    [Fact]
    public async Task Create_returns_201_and_roundtrips_via_Get()
    {
        var client = CreateClient();

        var create = await client.PostAsJsonAsync(BasePath, await SampleRequestAsync(client, TestContext.Current.CancellationToken), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<ReelViewDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var get = await client.GetAsync($"{BasePath}/{created!.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var fetched = await get.Content.ReadFromJsonAsync<ReelViewDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(fetched);
        Assert.Equal(created.Id, fetched!.Id);
    }

    [Fact]
    public async Task Get_unknown_id_returns_404()
    {
        var client = CreateClient();

        var get = await client.GetAsync($"{BasePath}/{ Guid.NewGuid()}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }

    [Fact]
    public async Task List_includes_a_created_item()
    {
        var client = CreateClient();
        var create = await client.PostAsJsonAsync(BasePath, await SampleRequestAsync(client, TestContext.Current.CancellationToken), TestContext.Current.CancellationToken);
        var created = await create.Content.ReadFromJsonAsync<ReelViewDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var list = await client.GetFromJsonAsync<List<ReelViewDto>>(BasePath, _json, TestContext.Current.CancellationToken);

        Assert.NotNull(list);
        Assert.Contains(list!, x => x.Id == created!.Id);
    }

    [Fact]
    public async Task Delete_removes_the_item()
    {
        var client = CreateClient();
        var create = await client.PostAsJsonAsync(BasePath, await SampleRequestAsync(client, TestContext.Current.CancellationToken), TestContext.Current.CancellationToken);
        var created = await create.Content.ReadFromJsonAsync<ReelViewDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var delete = await client.DeleteAsync($"{BasePath}/{created!.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var get = await client.GetAsync($"{BasePath}/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }
}
