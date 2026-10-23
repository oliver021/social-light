using Microsoft.Extensions.DependencyInjection;

namespace Chat.FunctionalTests;

/// <summary>
/// End-to-end HTTP tests for the <c>Chat</c> endpoints: real routing,
/// versioning, JSON, EF/Postgres round-trip. The broker is the in-memory
/// <see cref="CapturingEventBus"/>, so the published contract is asserted too.
/// </summary>
public sealed class ChatApiTests(  ChatApiFixture fixture) : IClassFixture<ChatApiFixture>
{
    private const string BasePath = "/api/chats";
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web);

    private HttpClient CreateClient()
        => fixture.CreateDefaultClient(new ApiVersionHandler(new QueryStringApiVersionWriter(), new ApiVersion(1, 0)));

    private static CreateChatRequest SampleRequest() => new(
        "sample Type",
        "sample Title"
    );

    [Fact]
    public async Task Create_returns_201()
    {
        var client = CreateClient();

        var create = await client.PostAsJsonAsync(BasePath, SampleRequest(), TestContext.Current.CancellationToken);

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
        var create = await client.PostAsJsonAsync(BasePath, SampleRequest(), TestContext.Current.CancellationToken);
        var created = await create.Content.ReadFromJsonAsync<ChatDto>(_json, TestContext.Current.CancellationToken);
        Assert.NotNull(created);

        var get = await client.GetAsync($"{BasePath}/{created!.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);

        var list = await client.GetFromJsonAsync<List<ChatDto>>(BasePath, _json, TestContext.Current.CancellationToken);
        Assert.DoesNotContain(list!, x => x.Id == created.Id);

        var delete = await client.DeleteAsync($"{BasePath}/{created.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, delete.StatusCode);
    }

    [Fact]
    public async Task Create_publishes_ChatCreated()
    {
        var client = CreateClient();

        await client.PostAsJsonAsync(BasePath, SampleRequest(), TestContext.Current.CancellationToken);

        var bus = fixture.Services.GetRequiredService<CapturingEventBus>();
        Assert.Contains(bus.Published, e => e is ChatCreated);
    }
}
