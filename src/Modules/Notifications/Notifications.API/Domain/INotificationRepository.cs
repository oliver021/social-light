namespace SocialLight.Notifications.Domain;

/// <summary>
/// Repository PORT for <c>Notification</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface INotificationRepository
{
    Task<Notification> AddAsync(Notification notification, CancellationToken cancellationToken = default);

    Task<Notification?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Notification>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
