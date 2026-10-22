namespace SocialLight.Reels.API.Api;

/// <summary>
/// HTTP endpoints for <c>Reel</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ReelEndpoints
{
    public static IEndpointRouteBuilder MapReelEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Reels")
            .MapGroup("/api/reels")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListReels")
            .WithSummary("List reels")
            .WithTags("Reels");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetReel")
            .WithSummary("Get a reel by id")
            .WithTags("Reels");

        api.MapPost("/", Create)
            .WithName("CreateReel")
            .WithSummary("Create a reel")
            .WithTags("Reels");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteReel")
            .WithSummary("Delete a reel")
            .WithTags("Reels");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ReelDto>>> List(
        ReelService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ReelDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ReelDto>, NotFound>> GetById(
        Guid id, ReelService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ReelDto>> Create(
        CreateReelRequest request, ReelService service, CancellationToken cancellationToken)
    {
        var reel = await service.CreateAsync(
            request.CreatorId,
            request.VideoUrl,
            request.Caption,
            request.Duration,
            request.Visibility,
            request.MusicTrackId,
            cancellationToken);

        var location = $"/api/reels/{ reel.Id}";
        return TypedResults.Created(location, ToDto(reel));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ReelService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ReelDto ToDto(Reel e) => new(
        e.Id,
        e.CreatorId,
        e.VideoUrl,
        e.Caption,
        e.Duration,
        e.Visibility,
        e.MusicTrackId
    );
}
