namespace SocialLight.Engagement.API.Api;

/// <summary>
/// HTTP endpoints for <c>Comment</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class CommentEndpoints
{
    public static IEndpointRouteBuilder MapCommentEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Comments")
            .MapGroup("/api/comments")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListComments")
            .WithSummary("List comments")
            .WithTags("Comments");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetComment")
            .WithSummary("Get a comment by id")
            .WithTags("Comments");

        api.MapPost("/", Create)
            .WithName("CreateComment")
            .WithSummary("Create a comment")
            .WithTags("Comments");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteComment")
            .WithSummary("Delete a comment")
            .WithTags("Comments");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<CommentDto>>> List(
        CommentService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<CommentDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<CommentDto>, NotFound>> GetById(
        Guid id, CommentService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<CommentDto>> Create(
        CreateCommentRequest request, CommentService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var authorId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var comment = await service.CreateAsync(
            authorId,
            request.TargetType,
            request.TargetId,
            request.ParentCommentId,
            request.Body,
            cancellationToken);

        var location = $"/api/comments/{ comment.Id}";
        return TypedResults.Created(location, ToDto(comment));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, CommentService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static CommentDto ToDto(Comment e) => new(
        e.Id,
        e.AuthorId,
        e.TargetType,
        e.TargetId,
        e.ParentCommentId,
        e.Body
    );
}
