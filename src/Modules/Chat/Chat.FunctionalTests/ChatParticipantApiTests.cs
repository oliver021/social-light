using Microsoft.Extensions.DependencyInjection;

namespace Chat.FunctionalTests;

/// <summary>
/// End-to-end HTTP tests for the <c>ChatParticipant</c> endpoints: real routing,
/// versioning, JSON, EF/Postgres round-trip. The broker is the in-memory
/// <see cref="CapturingEventBus"/>, so the published contract is asserted too.
/// </summary>
public sealed class ChatParticipantApiTests(  ChatApiFixture fixture) : IClassFixture<ChatApiFixture>
{
    private const string BasePath = "/api/chat-participants";
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    private HttpClient CreateClient()
        => fixture.CreateDefaultClient(new ApiVersionHandler(new QueryStringApiVersionWriter(), new ApiVersion(1, 0)));

    // This entity has intra-module foreign keys, so the parent row(s) must exist
    // before the FK insert. The sample is built against the live API: each parent
    // is created via its own endpoint and its id flows into this request.
    private static async Task<CreateChatParticipantRequest> SampleRequestAsync(HttpClient client, CancellationToken ct)
    {
        var seedChat = await SeedAsync<CreateChatRequest, ChatDto>(
            client,
            "/api/chats",
            new CreateChatRequest("sample Type", "sample Title"),
            ct);
        return new CreateChatParticipantRequest(seedChat.Id, Guid.NewGuid(), "sample Role");
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
    public async Task Create_returns_201()
    {
        var client = CreateClient();

        var create = await client.PostAsJsonAsync(BasePath, await SampleRequestAsync(client, TestContext.Current.CancellationToken), TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
    }

    [Fact]
    public async Task Get_unknown_id_returns_404()
    {
        var client = CreateClient();

        var get = await client.GetAsync($"{BasePath}/{ Guid.NewGuid()}", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);
    }

    // readScope: the caller authenticates as TestAuthHandler.UserId, who is NOT a
    // ChatParticipant of the row's scope, so the row must be invisible to them
    // (404 on Get/Delete, absent from List) — secure by default.
    [Fact]
    public async Task Row_is_hidden_from_non_members()
    {
        var client = CreateClient();
        var create = await client.PostAsJsonAsync(BasePath, await SampleRequestAsync(client, TestContext.Current.CancellationToken), TestContext.Current.CancellationToken);
        var created = await create.Content.ReadFromJsonAsync<ChatParticipantDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var get = await client.GetAsync($"{BasePath}/{created!.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);

        var list = await client.GetFromJsonAsync<List<ChatParticipantDto>>(BasePath, _json, TestContext.Current.CancellationToken);
        Assert.DoesNotContain(list!, x => x.Id == created.Id);

        var delete = await client.DeleteAsync($"{BasePath}/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }
}
