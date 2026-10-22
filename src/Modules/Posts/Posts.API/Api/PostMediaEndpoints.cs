namespace SocialLight.Posts.API.Api;

/// <summary>
/// HTTP endpoints for <c>PostMedia</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class PostMediaEndpoints
{
    public static IEndpointRouteBuilder MapPostMediaEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("PostMedias")
            .MapGroup("/api/post-medias")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListPostMedias")
            .WithSummary("List postMedias")
            .WithTags("PostMedias");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetPostMedia")
            .WithSummary("Get a postMedia by id")
            .WithTags("PostMedias");

        api.MapPost("/", Create)
            .WithName("CreatePostMedia")
            .WithSummary("Create a postMedia")
            .WithTags("PostMedias");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeletePostMedia")
            .WithSummary("Delete a postMedia")
            .WithTags("PostMedias");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<PostMediaDto>>> List(
        PostMediaService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<PostMediaDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<PostMediaDto>, NotFound>> GetById(
        Guid id, PostMediaService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<PostMediaDto>> Create(
        CreatePostMediaRequest request, PostMediaService service, CancellationToken cancellationToken)
    {
        var postMedia = await service.CreateAsync(
            request.PostId,
            request.FileUrl,
            request.MediaType,
            request.Position,
            cancellationToken);

        var location = $"/api/post-medias/{ postMedia.Id}";
        return TypedResults.Created(location, ToDto(postMedia));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, PostMediaService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static PostMediaDto ToDto(PostMedia e) => new(
        e.Id,
        e.PostId,
        e.FileUrl,
        e.MediaType,
        e.Position
    );
}
