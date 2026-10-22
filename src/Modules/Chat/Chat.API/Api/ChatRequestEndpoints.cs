namespace SocialLight.Chat.API.Api;

/// <summary>
/// HTTP endpoints for <c>ChatRequest</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ChatRequestEndpoints
{
    public static IEndpointRouteBuilder MapChatRequestEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("ChatRequests")
            .MapGroup("/api/chat-requests")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListChatRequests")
            .WithSummary("List chatRequests")
            .WithTags("ChatRequests");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetChatRequest")
            .WithSummary("Get a chatRequest by id")
            .WithTags("ChatRequests");

        api.MapPost("/", Create)
            .WithName("CreateChatRequest")
            .WithSummary("Create a chatRequest")
            .WithTags("ChatRequests");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteChatRequest")
            .WithSummary("Delete a chatRequest")
            .WithTags("ChatRequests");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ChatRequestDto>>> List(
        ChatRequestService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ChatRequestDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ChatRequestDto>, NotFound>> GetById(
        Guid id, ChatRequestService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ChatRequestDto>> Create(
        CreateChatRequestRequest request, ChatRequestService service, CancellationToken cancellationToken)
    {
        var chatRequest = await service.CreateAsync(
            request.RequesterId,
            request.RecipientId,
            request.Status,
            cancellationToken);

        var location = $"/api/chat-requests/{ chatRequest.Id}";
        return TypedResults.Created(location, ToDto(chatRequest));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ChatRequestService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ChatRequestDto ToDto(ChatRequest e) => new(
        e.Id,
        e.RequesterId,
        e.RecipientId,
        e.Status
    );
}
