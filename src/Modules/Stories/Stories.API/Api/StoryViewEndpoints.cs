namespace SocialLight.Stories.API.Api;

/// <summary>
/// HTTP endpoints for <c>StoryView</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class StoryViewEndpoints
{
    public static IEndpointRouteBuilder MapStoryViewEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("StoryViews")
            .MapGroup("/api/story-views")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListStoryViews")
            .WithSummary("List storyViews")
            .WithTags("StoryViews");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetStoryView")
            .WithSummary("Get a storyView by id")
            .WithTags("StoryViews");

        api.MapPost("/", Create)
            .WithName("CreateStoryView")
            .WithSummary("Create a storyView")
            .WithTags("StoryViews");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteStoryView")
            .WithSummary("Delete a storyView")
            .WithTags("StoryViews");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<StoryViewDto>>> List(
        StoryViewService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<StoryViewDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<StoryViewDto>, NotFound>> GetById(
        Guid id, StoryViewService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<StoryViewDto>> Create(
        CreateStoryViewRequest request, StoryViewService service, CancellationToken cancellationToken)
    {
        var storyView = await service.CreateAsync(
            request.StoryId,
            request.ViewerId,
            request.ViewedAt,
            cancellationToken);

        var location = $"/api/story-views/{ storyView.Id}";
        return TypedResults.Created(location, ToDto(storyView));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, StoryViewService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static StoryViewDto ToDto(StoryView e) => new(
        e.Id,
        e.StoryId,
        e.ViewerId,
        e.ViewedAt
    );
}
