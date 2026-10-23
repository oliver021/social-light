namespace SocialLight.Chat.API.Api;

/// <summary>
/// HTTP endpoints for <c>ChatBlock</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ChatBlockEndpoints
{
    public static IEndpointRouteBuilder MapChatBlockEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("ChatBlocks")
            .MapGroup("/api/chat-blocks")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListChatBlocks")
            .WithSummary("List chatBlocks")
            .WithTags("ChatBlocks");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetChatBlock")
            .WithSummary("Get a chatBlock by id")
            .WithTags("ChatBlocks");

        api.MapPost("/", Create)
            .WithName("CreateChatBlock")
            .WithSummary("Create a chatBlock")
            .WithTags("ChatBlocks");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteChatBlock")
            .WithSummary("Delete a chatBlock")
            .WithTags("ChatBlocks");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ChatBlockDto>>> List(
        ChatBlockService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ChatBlockDto>>([.. items.Where(scope).Select(ToDto)]);
    }

    public static async Task<Results<Ok<ChatBlockDto>, NotFound>> GetById(
        Guid id, ChatBlockService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var item = await service.GetAsync(id, cancellationToken);
        // Not visible to the caller == not found (never reveal that it exists).
        return item is null || !scope(item) ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ChatBlockDto>> Create(
        CreateChatBlockRequest request, ChatBlockService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var blockerId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var chatBlock = await service.CreateAsync(
            request.ChatId,
            blockerId,
            request.BlockedId,
            cancellationToken);

        var location = $"/api/chat-blocks/{ chatBlock.Id}";
        return TypedResults.Created(location, ToDto(chatBlock));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ChatBlockService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var item = await service.GetAsync(id, cancellationToken);
        if (item is null || !scope(item)) return TypedResults.NotFound();
        return await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();
    }

    /// <summary>
    /// Read scope (spec `readScope`): the caller sees only rows that concern them
    /// — rows where <c>BlockerId</c> is the caller.
    /// Derived from the JWT `sub`, never from the request.
    /// </summary>
    private static async Task<Func<ChatBlock, bool>> ScopeAsync(
        ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var me = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        await Task.CompletedTask;
        return e => e.BlockerId == me;
    }

    private static ChatBlockDto ToDto(ChatBlock e) => new(
        e.Id,
        e.ChatId,
        e.BlockerId,
        e.BlockedId
    );
}
