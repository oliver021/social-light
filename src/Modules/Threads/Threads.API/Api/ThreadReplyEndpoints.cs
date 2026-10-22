namespace SocialLight.Threads.API.Api;

/// <summary>
/// HTTP endpoints for <c>ThreadReply</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ThreadReplyEndpoints
{
    public static IEndpointRouteBuilder MapThreadReplyEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("ThreadReplies")
            .MapGroup("/api/thread-replies")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListThreadReplies")
            .WithSummary("List threadReplies")
            .WithTags("ThreadReplies");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetThreadReply")
            .WithSummary("Get a threadReply by id")
            .WithTags("ThreadReplies");

        api.MapPost("/", Create)
            .WithName("CreateThreadReply")
            .WithSummary("Create a threadReply")
            .WithTags("ThreadReplies");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteThreadReply")
            .WithSummary("Delete a threadReply")
            .WithTags("ThreadReplies");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ThreadReplyDto>>> List(
        ThreadReplyService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ThreadReplyDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ThreadReplyDto>, NotFound>> GetById(
        Guid id, ThreadReplyService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ThreadReplyDto>> Create(
        CreateThreadReplyRequest request, ThreadReplyService service, CancellationToken cancellationToken)
    {
        var threadReply = await service.CreateAsync(
            request.ThreadId,
            request.AuthorId,
            request.ParentReplyId,
            request.Body,
            cancellationToken);

        var location = $"/api/thread-replies/{ threadReply.Id}";
        return TypedResults.Created(location, ToDto(threadReply));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ThreadReplyService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ThreadReplyDto ToDto(ThreadReply e) => new(
        e.Id,
        e.ThreadId,
        e.AuthorId,
        e.ParentReplyId,
        e.Body
    );
}
