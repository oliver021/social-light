using Microsoft.Extensions.Logging;

namespace SocialLight.Notifications.API.Application;

/// <summary>
/// Application service for <c>Notification</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class NotificationService(
    INotificationRepository repository,
    ILogger<NotificationService> logger)
{
    public Task<Notification?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Notification>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Notification> CreateAsync(
        Guid recipientId,
        Guid actorId,
        string type,
        string entityType,
        Guid entityId,
        bool isRead,
        CancellationToken cancellationToken = default)
    {
        var notification = new Notification(
            recipientId,
            actorId,
            type,
            entityType,
            entityId,
            isRead
        );

        await repository.AddAsync(notification, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Notification), notification.Id);
        return notification;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
