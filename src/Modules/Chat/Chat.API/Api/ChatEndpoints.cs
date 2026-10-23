namespace SocialLight.Chat.API.Api;

/// <summary>
/// HTTP endpoints for <c>Chat</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ChatEndpoints
{
    public static IEndpointRouteBuilder MapChatEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Chats")
            .MapGroup("/api/chats")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListChats")
            .WithSummary("List chats")
            .WithTags("Chats");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetChat")
            .WithSummary("Get a chat by id")
            .WithTags("Chats");

        api.MapPost("/", Create)
            .WithName("CreateChat")
            .WithSummary("Create a chat")
            .WithTags("Chats");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteChat")
            .WithSummary("Delete a chat")
            .WithTags("Chats");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ChatDto>>> List(
        ChatService service, ChatParticipantService scopeService, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(scopeService, user, cancellationToken);
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ChatDto>>([.. items.Where(scope).Select(ToDto)]);
    }

    public static async Task<Results<Ok<ChatDto>, NotFound>> GetById(
        Guid id, ChatService service, ChatParticipantService scopeService, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(scopeService, user, cancellationToken);
        var item = await service.GetAsync(id, cancellationToken);
        // Not visible to the caller == not found (never reveal that it exists).
        return item is null || !scope(item) ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ChatDto>> Create(
        CreateChatRequest request, ChatService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var createdBy = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var chat = await service.CreateAsync(
            request.Type,
            request.Title,
            createdBy,
            cancellationToken);

        var location = $"/api/chats/{ chat.Id}";
        return TypedResults.Created(location, ToDto(chat));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ChatService service, ChatParticipantService scopeService, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(scopeService, user, cancellationToken);
        var item = await service.GetAsync(id, cancellationToken);
        if (item is null || !scope(item)) return TypedResults.NotFound();
        return await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();
    }

    /// <summary>
    /// Read scope (spec `readScope`): the caller sees only rows that concern them
    /// — rows whose <c>Id</c> belongs to a <c>ChatParticipant</c> they are a member of.
    /// Derived from the JWT `sub`, never from the request.
    /// </summary>
    private static async Task<Func<global::SocialLight.Chat.Domain.Chat, bool>> ScopeAsync(
        ChatParticipantService scopeService, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var me = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var mine = (await scopeService.ListAsync(cancellationToken))
            .Where(m => m.UserId == me)
            .Select(m => m.ChatId)
            .ToHashSet();
        return e => mine.Contains(e.Id);
    }

    private static ChatDto ToDto(global::SocialLight.Chat.Domain.Chat e) => new(
        e.Id,
        e.Type,
        e.Title,
        e.CreatedBy
    );
}
