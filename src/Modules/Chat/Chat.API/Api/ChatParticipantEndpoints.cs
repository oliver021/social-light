namespace SocialLight.Chat.API.Api;

/// <summary>
/// HTTP endpoints for <c>ChatParticipant</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ChatParticipantEndpoints
{
    public static IEndpointRouteBuilder MapChatParticipantEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("ChatParticipants")
            .MapGroup("/api/chat-participants")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListChatParticipants")
            .WithSummary("List chatParticipants")
            .WithTags("ChatParticipants");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetChatParticipant")
            .WithSummary("Get a chatParticipant by id")
            .WithTags("ChatParticipants");

        api.MapPost("/", Create)
            .WithName("CreateChatParticipant")
            .WithSummary("Create a chatParticipant")
            .WithTags("ChatParticipants");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteChatParticipant")
            .WithSummary("Delete a chatParticipant")
            .WithTags("ChatParticipants");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ChatParticipantDto>>> List(
        ChatParticipantService service, ChatParticipantService scopeService, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(scopeService, user, cancellationToken);
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ChatParticipantDto>>([.. items.Where(scope).Select(ToDto)]);
    }

    public static async Task<Results<Ok<ChatParticipantDto>, NotFound>> GetById(
        Guid id, ChatParticipantService service, ChatParticipantService scopeService, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(scopeService, user, cancellationToken);
        var item = await service.GetAsync(id, cancellationToken);
        // Not visible to the caller == not found (never reveal that it exists).
        return item is null || !scope(item) ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ChatParticipantDto>> Create(
        CreateChatParticipantRequest request, ChatParticipantService service, CancellationToken cancellationToken)
    {
        var chatParticipant = await service.CreateAsync(
            request.ChatId,
            request.UserId,
            request.Role,
            cancellationToken);

        var location = $"/api/chat-participants/{ chatParticipant.Id}";
        return TypedResults.Created(location, ToDto(chatParticipant));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ChatParticipantService service, ChatParticipantService scopeService, ClaimsPrincipal user, CancellationToken cancellationToken)
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
    /// — rows whose <c>ChatId</c> belongs to a <c>ChatParticipant</c> they are a member of.
    /// Derived from the JWT `sub`, never from the request.
    /// </summary>
    private static async Task<Func<ChatParticipant, bool>> ScopeAsync(
        ChatParticipantService scopeService, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var me = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var mine = (await scopeService.ListAsync(cancellationToken))
            .Where(m => m.UserId == me)
            .Select(m => m.ChatId)
            .ToHashSet();
        return e => mine.Contains(e.ChatId);
    }

    private static ChatParticipantDto ToDto(ChatParticipant e) => new(
        e.Id,
        e.ChatId,
        e.UserId,
        e.Role
    );
}
