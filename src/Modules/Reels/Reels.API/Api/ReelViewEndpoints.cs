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
        ReelViewService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ReelViewDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ReelViewDto>, NotFound>> GetById(
        Guid id, ReelViewService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ReelViewDto>> Create(
        CreateReelViewRequest request, ReelViewService service, CancellationToken cancellationToken)
    {
        var reelView = await service.CreateAsync(
            request.ReelId,
            request.ViewerId,
            request.ViewedAt,
            cancellationToken);

        var location = $"/api/reel-views/{ reelView.Id}";
        return TypedResults.Created(location, ToDto(reelView));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ReelViewService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ReelViewDto ToDto(ReelView e) => new(
        e.Id,
        e.ReelId,
        e.ViewerId,
        e.ViewedAt
    );
}
