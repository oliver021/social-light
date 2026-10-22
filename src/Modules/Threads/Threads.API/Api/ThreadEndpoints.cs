namespace SocialLight.Threads.API.Api;

/// <summary>
/// HTTP endpoints for <c>Thread</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ThreadEndpoints
{
    public static IEndpointRouteBuilder MapThreadEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Threads")
            .MapGroup("/api/threads")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListThreads")
            .WithSummary("List threads")
            .WithTags("Threads");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetThread")
            .WithSummary("Get a thread by id")
            .WithTags("Threads");

        api.MapPost("/", Create)
            .WithName("CreateThread")
            .WithSummary("Create a thread")
            .WithTags("Threads");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteThread")
            .WithSummary("Delete a thread")
            .WithTags("Threads");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ThreadDto>>> List(
        ThreadService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ThreadDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ThreadDto>, NotFound>> GetById(
        Guid id, ThreadService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ThreadDto>> Create(
        CreateThreadRequest request, ThreadService service, CancellationToken cancellationToken)
    {
        var thread = await service.CreateAsync(
            request.AuthorId,
            request.Title,
            request.Body,
            request.Visibility,
            cancellationToken);

        var location = $"/api/threads/{ thread.Id}";
        return TypedResults.Created(location, ToDto(thread));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ThreadService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ThreadDto ToDto(global::SocialLight.Threads.Domain.Thread e) => new(
        e.Id,
        e.AuthorId,
        e.Title,
        e.Body,
        e.Visibility
    );
}
