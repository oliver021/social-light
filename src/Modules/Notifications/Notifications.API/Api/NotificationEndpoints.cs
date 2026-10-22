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
        NotificationService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<NotificationDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<NotificationDto>, NotFound>> GetById(
        Guid id, NotificationService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<NotificationDto>> Create(
        CreateNotificationRequest request, NotificationService service, CancellationToken cancellationToken)
    {
        var notification = await service.CreateAsync(
            request.RecipientId,
            request.ActorId,
            request.Type,
            request.EntityType,
            request.EntityId,
            request.IsRead,
            cancellationToken);

        var location = $"/api/notifications/{ notification.Id}";
        return TypedResults.Created(location, ToDto(notification));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, NotificationService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

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
