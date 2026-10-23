namespace SocialLight.Notifications.API.Api;

/// <summary>
/// HTTP endpoints for <c>Notification</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class NotificationEndpoints
{
    public static IEndpointRouteBuilder MapNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Notifications")
            .MapGroup("/api/notifications")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListNotifications")
            .WithSummary("List notifications")
            .WithTags("Notifications");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetNotification")
            .WithSummary("Get a notification by id")
            .WithTags("Notifications");

        api.MapPost("/", Create)
            .WithName("CreateNotification")
            .WithSummary("Create a notification")
            .WithTags("Notifications");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteNotification")
            .WithSummary("Delete a notification")
            .WithTags("Notifications");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<NotificationDto>>> List(
        NotificationService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<NotificationDto>>([.. items.Where(scope).Select(ToDto)]);
    }

    public static async Task<Results<Ok<NotificationDto>, NotFound>> GetById(
        Guid id, NotificationService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var item = await service.GetAsync(id, cancellationToken);
        // Not visible to the caller == not found (never reveal that it exists).
        return item is null || !scope(item) ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<NotificationDto>> Create(
        CreateNotificationRequest request, NotificationService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var actorId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var notification = await service.CreateAsync(
            request.RecipientId,
            actorId,
            request.Type,
            request.EntityType,
            request.EntityId,
            request.IsRead,
            cancellationToken);

        var location = $"/api/notifications/{ notification.Id}";
        return TypedResults.Created(location, ToDto(notification));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, NotificationService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var item = await service.GetAsync(id, cancellationToken);
        if (item is null || !scope(item)) return TypedResults.NotFound();
        return await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();
    }

    /// <summary>
    /// Read scope (spec `readScope`): the caller sees only rows that concern them
    /// — rows where <c>RecipientId</c> is the caller.
    /// Derived from the JWT `sub`, never from the request.
    /// </summary>
    private static async Task<Func<Notification, bool>> ScopeAsync(
        ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var me = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        await Task.CompletedTask;
        return e => e.RecipientId == me;
    }

    private static NotificationDto ToDto(Notification e) => new(
        e.Id,
        e.RecipientId,
        e.ActorId,
        e.Type,
        e.EntityType,
        e.EntityId,
        e.IsRead
    );
}
