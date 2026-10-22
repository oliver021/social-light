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
        ChatParticipantService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ChatParticipantDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ChatParticipantDto>, NotFound>> GetById(
        Guid id, ChatParticipantService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
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
        Guid id, ChatParticipantService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ChatParticipantDto ToDto(ChatParticipant e) => new(
        e.Id,
        e.ChatId,
        e.UserId,
        e.Role
    );
}
