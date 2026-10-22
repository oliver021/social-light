namespace SocialLight.Recommendation.API.Api;

/// <summary>
/// HTTP endpoints for <c>Topic</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class TopicEndpoints
{
    public static IEndpointRouteBuilder MapTopicEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Topics")
            .MapGroup("/api/topics")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListTopics")
            .WithSummary("List topics")
            .WithTags("Topics");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetTopic")
            .WithSummary("Get a topic by id")
            .WithTags("Topics");

        api.MapPost("/", Create)
            .WithName("CreateTopic")
            .WithSummary("Create a topic")
            .WithTags("Topics");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteTopic")
            .WithSummary("Delete a topic")
            .WithTags("Topics");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<TopicDto>>> List(
        TopicService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<TopicDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<TopicDto>, NotFound>> GetById(
        Guid id, TopicService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<TopicDto>> Create(
        CreateTopicRequest request, TopicService service, CancellationToken cancellationToken)
    {
        var topic = await service.CreateAsync(
            request.Name,
            cancellationToken);

        var location = $"/api/topics/{ topic.Id}";
        return TypedResults.Created(location, ToDto(topic));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, TopicService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static TopicDto ToDto(Topic e) => new(
        e.Id,
        e.Name
    );
}
