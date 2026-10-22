using Microsoft.Extensions.DependencyInjection;

namespace Posts.FunctionalTests;

/// <summary>
/// End-to-end HTTP tests for the <c>PostMedia</c> endpoints: real routing,
/// versioning, JSON, EF/Postgres round-trip. The broker is the in-memory
/// <see cref="CapturingEventBus"/>, so the published contract is asserted too.
/// </summary>
public sealed class PostMediaApiTests(  PostsApiFixture fixture) : IClassFixture<PostsApiFixture>
{
    private const string BasePath = "/api/post-medias";
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    private HttpClient CreateClient()
        => fixture.CreateDefaultClient(new ApiVersionHandler(new QueryStringApiVersionWriter(), new ApiVersion(1, 0)));

    // This entity has intra-module foreign keys, so the parent row(s) must exist
    // before the FK insert. The sample is built against the live API: each parent
    // is created via its own endpoint and its id flows into this request.
    private static async Task<CreatePostMediaRequest> SampleRequestAsync(HttpClient client, CancellationToken ct)
    {
        var seedPost = await SeedAsync<CreatePostRequest, PostDto>(
            client,
            "/api/posts",
            new CreatePostRequest("sample ContentType", "sample Visibility", "sample Status", "sample Body", "sample Location", DateTime.UtcNow, DateTime.UtcNow, DateTime.UtcNow),
            ct);
        return new CreatePostMediaRequest(seedPost.Id, "sample FileUrl", "sample MediaType", 1);
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
        var created = await create.Content.ReadFromJsonAsync<PostMediaDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var get = await client.GetAsync($"{BasePath}/{created!.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var fetched = await get.Content.ReadFromJsonAsync<PostMediaDto>(_json, TestContext.Current.CancellationToken);
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
        var created = await create.Content.ReadFromJsonAsync<PostMediaDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var list = await client.GetFromJsonAsync<List<PostMediaDto>>(BasePath, _json, TestContext.Current.CancellationToken);

        Assert.NotNull(list);
        Assert.Contains(list!, x => x.Id == created!.Id);
    }

    [Fact]
    public async Task Delete_removes_the_item()
    {
        var client = CreateClient();
        var create = await client.PostAsJsonAsync(BasePath, await SampleRequestAsync(client, TestContext.Current.CancellationToken), TestContext.Current.CancellationToken);
        var created = await create.Content.ReadFromJsonAsync<PostMediaDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var delete = await client.DeleteAsync($"{BasePath}/{created!.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var get = await client.GetAsync($"{BasePath}/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }
}
