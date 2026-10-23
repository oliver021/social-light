namespace SocialLight.Stories.API.Api;

/// <summary>
/// HTTP endpoints for <c>Story</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class StoryEndpoints
{
    public static IEndpointRouteBuilder MapStoryEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Stories")
            .MapGroup("/api/stories")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListStories")
            .WithSummary("List stories")
            .WithTags("Stories");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetStory")
            .WithSummary("Get a story by id")
            .WithTags("Stories");

        api.MapPost("/", Create)
            .WithName("CreateStory")
            .WithSummary("Create a story")
            .WithTags("Stories");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteStory")
            .WithSummary("Delete a story")
            .WithTags("Stories");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<StoryDto>>> List(
        StoryService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<StoryDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<StoryDto>, NotFound>> GetById(
        Guid id, StoryService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<StoryDto>> Create(
        CreateStoryRequest request, StoryService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var authorId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var story = await service.CreateAsync(
            authorId,
            request.MediaType,
            request.MediaUrl,
            request.Caption,
            request.Visibility,
            request.ExpiresAt,
            cancellationToken);

        var location = $"/api/stories/{ story.Id}";
        return TypedResults.Created(location, ToDto(story));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, StoryService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static StoryDto ToDto(Story e) => new(
        e.Id,
        e.AuthorId,
        e.MediaType,
        e.MediaUrl,
        e.Caption,
        e.Visibility,
        e.ExpiresAt
    );
}
