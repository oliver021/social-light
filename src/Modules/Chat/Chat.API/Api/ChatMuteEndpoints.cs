namespace SocialLight.Chat.API.Api;

/// <summary>
/// HTTP endpoints for <c>ChatMute</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ChatMuteEndpoints
{
    public static IEndpointRouteBuilder MapChatMuteEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("ChatMutes")
            .MapGroup("/api/chat-mutes")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListChatMutes")
            .WithSummary("List chatMutes")
            .WithTags("ChatMutes");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetChatMute")
            .WithSummary("Get a chatMute by id")
            .WithTags("ChatMutes");

        api.MapPost("/", Create)
            .WithName("CreateChatMute")
            .WithSummary("Create a chatMute")
            .WithTags("ChatMutes");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteChatMute")
            .WithSummary("Delete a chatMute")
            .WithTags("ChatMutes");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ChatMuteDto>>> List(
        ChatMuteService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ChatMuteDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ChatMuteDto>, NotFound>> GetById(
        Guid id, ChatMuteService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ChatMuteDto>> Create(
        CreateChatMuteRequest request, ChatMuteService service, CancellationToken cancellationToken)
    {
        var chatMute = await service.CreateAsync(
            request.ChatId,
            request.UserId,
            request.MutedUntil,
            cancellationToken);

        var location = $"/api/chat-mutes/{ chatMute.Id}";
        return TypedResults.Created(location, ToDto(chatMute));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ChatMuteService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ChatMuteDto ToDto(ChatMute e) => new(
        e.Id,
        e.ChatId,
        e.UserId,
        e.MutedUntil
    );
}
