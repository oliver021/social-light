namespace SocialLight.Posts.API.Api;

/// <summary>
/// HTTP endpoints for <c>Post</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class PostEndpoints
{
    public static IEndpointRouteBuilder MapPostEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Posts")
            .MapGroup("/api/posts")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListPosts")
            .WithSummary("List posts")
            .WithTags("Posts");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetPost")
            .WithSummary("Get a post by id")
            .WithTags("Posts");

        api.MapPost("/", Create)
            .WithName("CreatePost")
            .WithSummary("Create a post")
            .WithTags("Posts");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeletePost")
            .WithSummary("Delete a post")
            .WithTags("Posts");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<PostDto>>> List(
        PostService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<PostDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<PostDto>, NotFound>> GetById(
        Guid id, PostService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<PostDto>> Create(
        CreatePostRequest request, PostService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var authorId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var post = await service.CreateAsync(
            request.Title,
            request.Body,
            authorId,
            cancellationToken);

        var location = $"/api/posts/{ post.Id}";
        return TypedResults.Created(location, ToDto(post));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, PostService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static PostDto ToDto(Post e) => new(
        e.Id,
        e.Title,
        e.Body,
        e.AuthorId
    );
}
