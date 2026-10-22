using Microsoft.Extensions.Logging;

namespace SocialLight.Notifications.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="INotificationRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfNotificationRepository(
    NotificationsDbContext context,
    ILogger<EfNotificationRepository> logger) : INotificationRepository
{
    public async Task<Notification> AddAsync(Notification notification, CancellationToken cancellationToken = default)
    {
        context.Notifications.Add(notification);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Notification), notification.Id);
        return notification;
    }

    public Task<Notification?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Notifications.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Notification>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Notifications.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var notification = await context.Notifications.FindAsync([id], cancellationToken);
        if (notification is null)
        {
            return false;
        }

        context.Notifications.Remove(notification);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Notification), id);
        return true;
    }
}
