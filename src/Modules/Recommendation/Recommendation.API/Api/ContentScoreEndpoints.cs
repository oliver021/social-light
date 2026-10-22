namespace SocialLight.Recommendation.API.Api;

/// <summary>
/// HTTP endpoints for <c>ContentScore</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ContentScoreEndpoints
{
    public static IEndpointRouteBuilder MapContentScoreEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("ContentScores")
            .MapGroup("/api/content-scores")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListContentScores")
            .WithSummary("List contentScores")
            .WithTags("ContentScores");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetContentScore")
            .WithSummary("Get a contentScore by id")
            .WithTags("ContentScores");

        api.MapPost("/", Create)
            .WithName("CreateContentScore")
            .WithSummary("Create a contentScore")
            .WithTags("ContentScores");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteContentScore")
            .WithSummary("Delete a contentScore")
            .WithTags("ContentScores");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ContentScoreDto>>> List(
        ContentScoreService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ContentScoreDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ContentScoreDto>, NotFound>> GetById(
        Guid id, ContentScoreService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ContentScoreDto>> Create(
        CreateContentScoreRequest request, ContentScoreService service, CancellationToken cancellationToken)
    {
        var contentScore = await service.CreateAsync(
            request.TargetType,
            request.TargetId,
            request.Score,
            request.ComputedAt,
            cancellationToken);

        var location = $"/api/content-scores/{ contentScore.Id}";
        return TypedResults.Created(location, ToDto(contentScore));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ContentScoreService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ContentScoreDto ToDto(ContentScore e) => new(
        e.Id,
        e.TargetType,
        e.TargetId,
        e.Score,
        e.ComputedAt
    );
}
