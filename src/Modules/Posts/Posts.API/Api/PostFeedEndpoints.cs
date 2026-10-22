namespace SocialLight.Posts.API.Api;

/// <summary>
/// HTTP endpoints for <c>PostFeed</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class PostFeedEndpoints
{
    public static IEndpointRouteBuilder MapPostFeedEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("PostFeeds")
            .MapGroup("/api/post-feeds")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListPostFeeds")
            .WithSummary("List postFeeds")
            .WithTags("PostFeeds");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetPostFeed")
            .WithSummary("Get a postFeed by id")
            .WithTags("PostFeeds");

        api.MapPost("/", Create)
            .WithName("CreatePostFeed")
            .WithSummary("Create a postFeed")
            .WithTags("PostFeeds");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeletePostFeed")
            .WithSummary("Delete a postFeed")
            .WithTags("PostFeeds");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<PostFeedDto>>> List(
        PostFeedService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<PostFeedDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<PostFeedDto>, NotFound>> GetById(
        Guid id, PostFeedService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<PostFeedDto>> Create(
        CreatePostFeedRequest request, PostFeedService service, CancellationToken cancellationToken)
    {
        var postFeed = await service.CreateAsync(
            request.PostId,
            request.FeedType,
            request.TargetId,
            cancellationToken);

        var location = $"/api/post-feeds/{ postFeed.Id}";
        return TypedResults.Created(location, ToDto(postFeed));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, PostFeedService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static PostFeedDto ToDto(PostFeed e) => new(
        e.Id,
        e.PostId,
        e.FeedType,
        e.TargetId
    );
}
