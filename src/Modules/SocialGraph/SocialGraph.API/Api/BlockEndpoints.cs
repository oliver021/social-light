namespace SocialLight.SocialGraph.API.Api;

/// <summary>
/// HTTP endpoints for <c>Block</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class BlockEndpoints
{
    public static IEndpointRouteBuilder MapBlockEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Blocks")
            .MapGroup("/api/blocks")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListBlocks")
            .WithSummary("List blocks")
            .WithTags("Blocks");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetBlock")
            .WithSummary("Get a block by id")
            .WithTags("Blocks");

        api.MapPost("/", Create)
            .WithName("CreateBlock")
            .WithSummary("Create a block")
            .WithTags("Blocks");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteBlock")
            .WithSummary("Delete a block")
            .WithTags("Blocks");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<BlockDto>>> List(
        BlockService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<BlockDto>>([.. items.Where(scope).Select(ToDto)]);
    }

    public static async Task<Results<Ok<BlockDto>, NotFound>> GetById(
        Guid id, BlockService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var item = await service.GetAsync(id, cancellationToken);
        // Not visible to the caller == not found (never reveal that it exists).
        return item is null || !scope(item) ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<BlockDto>> Create(
        CreateBlockRequest request, BlockService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var blockerId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var block = await service.CreateAsync(
            blockerId,
            request.BlockedId,
            request.Reason,
            cancellationToken);

        var location = $"/api/blocks/{ block.Id}";
        return TypedResults.Created(location, ToDto(block));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, BlockService service, ClaimsPrincipal user, CancellationToken cancellationToken)
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
    private static async Task<Func<Block, bool>> ScopeAsync(
        ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var me = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        await Task.CompletedTask;
        return e => e.BlockerId == me;
    }

    private static BlockDto ToDto(Block e) => new(
        e.Id,
        e.BlockerId,
        e.BlockedId,
        e.Reason
    );
}
