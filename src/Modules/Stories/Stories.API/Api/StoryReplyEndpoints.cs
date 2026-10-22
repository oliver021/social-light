namespace SocialLight.Stories.API.Api;

/// <summary>
/// HTTP endpoints for <c>StoryReply</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class StoryReplyEndpoints
{
    public static IEndpointRouteBuilder MapStoryReplyEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("StoryReplies")
            .MapGroup("/api/story-replies")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListStoryReplies")
            .WithSummary("List storyReplies")
            .WithTags("StoryReplies");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetStoryReply")
            .WithSummary("Get a storyReply by id")
            .WithTags("StoryReplies");

        api.MapPost("/", Create)
            .WithName("CreateStoryReply")
            .WithSummary("Create a storyReply")
            .WithTags("StoryReplies");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteStoryReply")
            .WithSummary("Delete a storyReply")
            .WithTags("StoryReplies");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<StoryReplyDto>>> List(
        StoryReplyService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<StoryReplyDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<StoryReplyDto>, NotFound>> GetById(
        Guid id, StoryReplyService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<StoryReplyDto>> Create(
        CreateStoryReplyRequest request, StoryReplyService service, CancellationToken cancellationToken)
    {
        var storyReply = await service.CreateAsync(
            request.StoryId,
            request.UserId,
            request.Body,
            cancellationToken);

        var location = $"/api/story-replies/{ storyReply.Id}";
        return TypedResults.Created(location, ToDto(storyReply));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, StoryReplyService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static StoryReplyDto ToDto(StoryReply e) => new(
        e.Id,
        e.StoryId,
        e.UserId,
        e.Body
    );
}
