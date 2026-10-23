namespace SocialLight.Reels.API.Api;

/// <summary>
/// HTTP endpoints for <c>ReelView</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ReelViewEndpoints
{
    public static IEndpointRouteBuilder MapReelViewEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("ReelViews")
            .MapGroup("/api/reel-views")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListReelViews")
            .WithSummary("List reelViews")
            .WithTags("ReelViews");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetReelView")
            .WithSummary("Get a reelView by id")
            .WithTags("ReelViews");

        api.MapPost("/", Create)
            .WithName("CreateReelView")
            .WithSummary("Create a reelView")
            .WithTags("ReelViews");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteReelView")
            .WithSummary("Delete a reelView")
            .WithTags("ReelViews");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ReelViewDto>>> List(
        ReelViewService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ReelViewDto>>([.. items.Where(scope).Select(ToDto)]);
    }

    public static async Task<Results<Ok<ReelViewDto>, NotFound>> GetById(
        Guid id, ReelViewService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var item = await service.GetAsync(id, cancellationToken);
        // Not visible to the caller == not found (never reveal that it exists).
        return item is null || !scope(item) ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ReelViewDto>> Create(
        CreateReelViewRequest request, ReelViewService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var viewerId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var reelView = await service.CreateAsync(
            request.ReelId,
            viewerId,
            request.ViewedAt,
            cancellationToken);

        var location = $"/api/reel-views/{ reelView.Id}";
        return TypedResults.Created(location, ToDto(reelView));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ReelViewService service, ClaimsPrincipal user, CancellationToken cancellationToken)
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
    /// — rows where <c>ViewerId</c> is the caller.
    /// Derived from the JWT `sub`, never from the request.
    /// </summary>
    private static async Task<Func<ReelView, bool>> ScopeAsync(
        ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var me = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        await Task.CompletedTask;
        return e => e.ViewerId == me;
    }

    private static ReelViewDto ToDto(ReelView e) => new(
        e.Id,
        e.ReelId,
        e.ViewerId,
        e.ViewedAt
    );
}
