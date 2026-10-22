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
        ChatService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ChatDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ChatDto>, NotFound>> GetById(
        Guid id, ChatService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ChatDto>> Create(
        CreateChatRequest request, ChatService service, CancellationToken cancellationToken)
    {
        var chat = await service.CreateAsync(
            request.Type,
            request.Title,
            request.CreatedBy,
            cancellationToken);

        var location = $"/api/chats/{ chat.Id}";
        return TypedResults.Created(location, ToDto(chat));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ChatService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ChatDto ToDto(global::SocialLight.Chat.Domain.Chat e) => new(
        e.Id,
        e.Type,
        e.Title,
        e.CreatedBy
    );
}
