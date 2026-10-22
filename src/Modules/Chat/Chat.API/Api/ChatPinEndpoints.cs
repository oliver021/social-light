namespace SocialLight.Chat.API.Api;

/// <summary>
/// HTTP endpoints for <c>ChatPin</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ChatPinEndpoints
{
    public static IEndpointRouteBuilder MapChatPinEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("ChatPins")
            .MapGroup("/api/chat-pins")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListChatPins")
            .WithSummary("List chatPins")
            .WithTags("ChatPins");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetChatPin")
            .WithSummary("Get a chatPin by id")
            .WithTags("ChatPins");

        api.MapPost("/", Create)
            .WithName("CreateChatPin")
            .WithSummary("Create a chatPin")
            .WithTags("ChatPins");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteChatPin")
            .WithSummary("Delete a chatPin")
            .WithTags("ChatPins");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ChatPinDto>>> List(
        ChatPinService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ChatPinDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ChatPinDto>, NotFound>> GetById(
        Guid id, ChatPinService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ChatPinDto>> Create(
        CreateChatPinRequest request, ChatPinService service, CancellationToken cancellationToken)
    {
        var chatPin = await service.CreateAsync(
            request.ChatId,
            request.MessageId,
            cancellationToken);

        var location = $"/api/chat-pins/{ chatPin.Id}";
        return TypedResults.Created(location, ToDto(chatPin));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ChatPinService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ChatPinDto ToDto(ChatPin e) => new(
        e.Id,
        e.ChatId,
        e.MessageId
    );
}
