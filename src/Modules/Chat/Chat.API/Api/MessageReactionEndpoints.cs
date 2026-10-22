namespace SocialLight.Chat.API.Api;

/// <summary>
/// HTTP endpoints for <c>MessageReaction</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class MessageReactionEndpoints
{
    public static IEndpointRouteBuilder MapMessageReactionEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("MessageReactions")
            .MapGroup("/api/message-reactions")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListMessageReactions")
            .WithSummary("List messageReactions")
            .WithTags("MessageReactions");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetMessageReaction")
            .WithSummary("Get a messageReaction by id")
            .WithTags("MessageReactions");

        api.MapPost("/", Create)
            .WithName("CreateMessageReaction")
            .WithSummary("Create a messageReaction")
            .WithTags("MessageReactions");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteMessageReaction")
            .WithSummary("Delete a messageReaction")
            .WithTags("MessageReactions");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<MessageReactionDto>>> List(
        MessageReactionService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<MessageReactionDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<MessageReactionDto>, NotFound>> GetById(
        Guid id, MessageReactionService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<MessageReactionDto>> Create(
        CreateMessageReactionRequest request, MessageReactionService service, CancellationToken cancellationToken)
    {
        var messageReaction = await service.CreateAsync(
            request.MessageId,
            request.UserId,
            request.ReactionType,
            cancellationToken);

        var location = $"/api/message-reactions/{ messageReaction.Id}";
        return TypedResults.Created(location, ToDto(messageReaction));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, MessageReactionService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static MessageReactionDto ToDto(MessageReaction e) => new(
        e.Id,
        e.MessageId,
        e.UserId,
        e.ReactionType
    );
}
