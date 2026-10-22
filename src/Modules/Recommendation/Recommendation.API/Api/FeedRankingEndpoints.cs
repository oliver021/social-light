namespace SocialLight.Recommendation.API.Api;

/// <summary>
/// HTTP endpoints for <c>FeedRanking</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class FeedRankingEndpoints
{
    public static IEndpointRouteBuilder MapFeedRankingEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("FeedRankings")
            .MapGroup("/api/feed-rankings")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListFeedRankings")
            .WithSummary("List feedRankings")
            .WithTags("FeedRankings");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetFeedRanking")
            .WithSummary("Get a feedRanking by id")
            .WithTags("FeedRankings");

        api.MapPost("/", Create)
            .WithName("CreateFeedRanking")
            .WithSummary("Create a feedRanking")
            .WithTags("FeedRankings");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteFeedRanking")
            .WithSummary("Delete a feedRanking")
            .WithTags("FeedRankings");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<FeedRankingDto>>> List(
        FeedRankingService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<FeedRankingDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<FeedRankingDto>, NotFound>> GetById(
        Guid id, FeedRankingService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<FeedRankingDto>> Create(
        CreateFeedRankingRequest request, FeedRankingService service, CancellationToken cancellationToken)
    {
        var feedRanking = await service.CreateAsync(
            request.UserId,
            request.TargetType,
            request.TargetId,
            request.Rank,
            cancellationToken);

        var location = $"/api/feed-rankings/{ feedRanking.Id}";
        return TypedResults.Created(location, ToDto(feedRanking));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, FeedRankingService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static FeedRankingDto ToDto(FeedRanking e) => new(
        e.Id,
        e.UserId,
        e.TargetType,
        e.TargetId,
        e.Rank
    );
}
