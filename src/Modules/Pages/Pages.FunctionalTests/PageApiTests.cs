using Microsoft.Extensions.DependencyInjection;

namespace Pages.FunctionalTests;

/// <summary>
/// End-to-end HTTP tests for the <c>Page</c> endpoints: real routing,
/// versioning, JSON, EF/Postgres round-trip. The broker is the in-memory
/// <see cref="CapturingEventBus"/>, so the published contract is asserted too.
/// </summary>
public sealed class PageApiTests(  PagesApiFixture fixture) : IClassFixture<PagesApiFixture>
{
    private const string BasePath = "/api/pages";
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    private HttpClient CreateClient()
        => fixture.CreateDefaultClient(new ApiVersionHandler(new QueryStringApiVersionWriter(), new ApiVersion(1, 0)));

    private static CreatePageRequest SampleRequest() => new(
        "sample Name",
        "sample Category",
        "sample Description",
        "sample Avatar",
        "sample CoverImage",
        "sample VerificationStatus"
    );

    [Fact]
    public async Task Create_returns_201_and_roundtrips_via_Get()
    {
        var client = CreateClient();

        var create = await client.PostAsJsonAsync(BasePath, SampleRequest(), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<PageDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var get = await client.GetAsync($"{BasePath}/{created!.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var fetched = await get.Content.ReadFromJsonAsync<PageDto>(_json, TestContext.Current.CancellationToken);
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
        var create = await client.PostAsJsonAsync(BasePath, SampleRequest(), TestContext.Current.CancellationToken);
        var created = await create.Content.ReadFromJsonAsync<PageDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var list = await client.GetFromJsonAsync<List<PageDto>>(BasePath, _json, TestContext.Current.CancellationToken);

        Assert.NotNull(list);
        Assert.Contains(list!, x => x.Id == created!.Id);
    }

    [Fact]
    public async Task Delete_removes_the_item()
    {
        var client = CreateClient();
        var create = await client.PostAsJsonAsync(BasePath, SampleRequest(), TestContext.Current.CancellationToken);
        var created = await create.Content.ReadFromJsonAsync<PageDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var delete = await client.DeleteAsync($"{BasePath}/{created!.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var get = await client.GetAsync($"{BasePath}/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }

    [Fact]
    public async Task Create_publishes_PageCreated()
    {
        var client = CreateClient();

        await client.PostAsJsonAsync(BasePath, SampleRequest(), TestContext.Current.CancellationToken);

        var bus = fixture.Services.GetRequiredService<CapturingEventBus>();
        Assert.Contains(bus.Published, e => e is PageCreated);
    }
}
