namespace SocialLight.Chat.API.Api;

/// <summary>
/// HTTP endpoints for <c>Message</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class MessageEndpoints
{
    public static IEndpointRouteBuilder MapMessageEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Messages")
            .MapGroup("/api/messages")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListMessages")
            .WithSummary("List messages")
            .WithTags("Messages");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetMessage")
            .WithSummary("Get a message by id")
            .WithTags("Messages");

        api.MapPost("/", Create)
            .WithName("CreateMessage")
            .WithSummary("Create a message")
            .WithTags("Messages");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteMessage")
            .WithSummary("Delete a message")
            .WithTags("Messages");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<MessageDto>>> List(
        MessageService service, ChatParticipantService scopeService, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(scopeService, user, cancellationToken);
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<MessageDto>>([.. items.Where(scope).Select(ToDto)]);
    }

    public static async Task<Results<Ok<MessageDto>, NotFound>> GetById(
        Guid id, MessageService service, ChatParticipantService scopeService, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(scopeService, user, cancellationToken);
        var item = await service.GetAsync(id, cancellationToken);
        // Not visible to the caller == not found (never reveal that it exists).
        return item is null || !scope(item) ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<MessageDto>> Create(
        CreateMessageRequest request, MessageService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var senderId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var message = await service.CreateAsync(
            request.ChatId,
            senderId,
            request.ContentType,
            request.Content,
            request.EditedAt,
            cancellationToken);

        var location = $"/api/messages/{ message.Id}";
        return TypedResults.Created(location, ToDto(message));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, MessageService service, ChatParticipantService scopeService, ClaimsPrincipal user, CancellationToken cancellationToken)
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
    private static async Task<Func<Message, bool>> ScopeAsync(
        ChatParticipantService scopeService, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var me = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var mine = (await scopeService.ListAsync(cancellationToken))
            .Where(m => m.UserId == me)
            .Select(m => m.ChatId)
            .ToHashSet();
        return e => mine.Contains(e.ChatId);
    }

    private static MessageDto ToDto(Message e) => new(
        e.Id,
        e.ChatId,
        e.SenderId,
        e.ContentType,
        e.Content,
        e.EditedAt
    );
}
