namespace SocialLight.Threads.API.Api;

/// <summary>
/// HTTP endpoints for <c>ThreadSubscription</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ThreadSubscriptionEndpoints
{
    public static IEndpointRouteBuilder MapThreadSubscriptionEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("ThreadSubscriptions")
            .MapGroup("/api/thread-subscriptions")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListThreadSubscriptions")
            .WithSummary("List threadSubscriptions")
            .WithTags("ThreadSubscriptions");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetThreadSubscription")
            .WithSummary("Get a threadSubscription by id")
            .WithTags("ThreadSubscriptions");

        api.MapPost("/", Create)
            .WithName("CreateThreadSubscription")
            .WithSummary("Create a threadSubscription")
            .WithTags("ThreadSubscriptions");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteThreadSubscription")
            .WithSummary("Delete a threadSubscription")
            .WithTags("ThreadSubscriptions");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ThreadSubscriptionDto>>> List(
        ThreadSubscriptionService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ThreadSubscriptionDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ThreadSubscriptionDto>, NotFound>> GetById(
        Guid id, ThreadSubscriptionService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ThreadSubscriptionDto>> Create(
        CreateThreadSubscriptionRequest request, ThreadSubscriptionService service, CancellationToken cancellationToken)
    {
        var threadSubscription = await service.CreateAsync(
            request.ThreadId,
            request.UserId,
            cancellationToken);

        var location = $"/api/thread-subscriptions/{ threadSubscription.Id}";
        return TypedResults.Created(location, ToDto(threadSubscription));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ThreadSubscriptionService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ThreadSubscriptionDto ToDto(ThreadSubscription e) => new(
        e.Id,
        e.ThreadId,
        e.UserId
    );
}
