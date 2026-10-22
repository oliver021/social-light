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
        MessageService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<MessageDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<MessageDto>, NotFound>> GetById(
        Guid id, MessageService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<MessageDto>> Create(
        CreateMessageRequest request, MessageService service, CancellationToken cancellationToken)
    {
        var message = await service.CreateAsync(
            request.ChatId,
            request.SenderId,
            request.ContentType,
            request.Content,
            request.EditedAt,
            cancellationToken);

        var location = $"/api/messages/{ message.Id}";
        return TypedResults.Created(location, ToDto(message));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, MessageService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static MessageDto ToDto(Message e) => new(
        e.Id,
        e.ChatId,
        e.SenderId,
        e.ContentType,
        e.Content,
        e.EditedAt
    );
}
