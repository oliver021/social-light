using Microsoft.Extensions.DependencyInjection;

namespace Chat.FunctionalTests;

/// <summary>
/// End-to-end HTTP tests for the <c>MessageAttachment</c> endpoints: real routing,
/// versioning, JSON, EF/Postgres round-trip. The broker is the in-memory
/// <see cref="CapturingEventBus"/>, so the published contract is asserted too.
/// </summary>
public sealed class MessageAttachmentApiTests(  ChatApiFixture fixture) : IClassFixture<ChatApiFixture>
{
    private const string BasePath = "/api/message-attachments";
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    private HttpClient CreateClient()
        => fixture.CreateDefaultClient(new ApiVersionHandler(new QueryStringApiVersionWriter(), new ApiVersion(1, 0)));

    // This entity has intra-module foreign keys, so the parent row(s) must exist
    // before the FK insert. The sample is built against the live API: each parent
    // is created via its own endpoint and its id flows into this request.
    private static async Task<CreateMessageAttachmentRequest> SampleRequestAsync(HttpClient client, CancellationToken ct)
    {
        var seedChat = await SeedAsync<CreateChatRequest, ChatDto>(
            client,
            "/api/chats",
            new CreateChatRequest("sample Type", "sample Title"),
            ct);
        var seedMessage = await SeedAsync<CreateMessageRequest, MessageDto>(
            client,
            "/api/messages",
            new CreateMessageRequest(seedChat.Id, "sample ContentType", "sample Content", DateTime.UtcNow),
            ct);
        return new CreateMessageAttachmentRequest(seedMessage.Id, "sample FileUrl", "sample MediaType");
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
        var created = await create.Content.ReadFromJsonAsync<MessageAttachmentDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var get = await client.GetAsync($"{BasePath}/{created!.Id}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, get.StatusCode);
        var fetched = await get.Content.ReadFromJsonAsync<MessageAttachmentDto>(_json, TestContext.Current.CancellationToken);
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
        var created = await create.Content.ReadFromJsonAsync<MessageAttachmentDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var list = await client.GetFromJsonAsync<List<MessageAttachmentDto>>(BasePath, _json, TestContext.Current.CancellationToken);

        Assert.NotNull(list);
        Assert.Contains(list!, x => x.Id == created!.Id);
    }

    [Fact]
    public async Task Delete_removes_the_item()
    {
        var client = CreateClient();
        var create = await client.PostAsJsonAsync(BasePath, await SampleRequestAsync(client, TestContext.Current.CancellationToken), TestContext.Current.CancellationToken);
        var created = await create.Content.ReadFromJsonAsync<MessageAttachmentDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var delete = await client.DeleteAsync($"{BasePath}/{created!.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, delete.StatusCode);

        var get = await client.GetAsync($"{BasePath}/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }
}
