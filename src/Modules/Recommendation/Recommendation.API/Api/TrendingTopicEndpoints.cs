namespace SocialLight.Recommendation.API.Api;

/// <summary>
/// HTTP endpoints for <c>TrendingTopic</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class TrendingTopicEndpoints
{
    public static IEndpointRouteBuilder MapTrendingTopicEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("TrendingTopics")
            .MapGroup("/api/trending-topics")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListTrendingTopics")
            .WithSummary("List trendingTopics")
            .WithTags("TrendingTopics");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetTrendingTopic")
            .WithSummary("Get a trendingTopic by id")
            .WithTags("TrendingTopics");

        api.MapPost("/", Create)
            .WithName("CreateTrendingTopic")
            .WithSummary("Create a trendingTopic")
            .WithTags("TrendingTopics");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteTrendingTopic")
            .WithSummary("Delete a trendingTopic")
            .WithTags("TrendingTopics");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<TrendingTopicDto>>> List(
        TrendingTopicService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<TrendingTopicDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<TrendingTopicDto>, NotFound>> GetById(
        Guid id, TrendingTopicService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<TrendingTopicDto>> Create(
        CreateTrendingTopicRequest request, TrendingTopicService service, CancellationToken cancellationToken)
    {
        var trendingTopic = await service.CreateAsync(
            request.TopicId,
            request.Region,
            request.Score,
            cancellationToken);

        var location = $"/api/trending-topics/{ trendingTopic.Id}";
        return TypedResults.Created(location, ToDto(trendingTopic));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, TrendingTopicService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static TrendingTopicDto ToDto(TrendingTopic e) => new(
        e.Id,
        e.TopicId,
        e.Region,
        e.Score
    );
}
