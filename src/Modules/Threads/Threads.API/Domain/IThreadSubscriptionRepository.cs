namespace SocialLight.Threads.Domain;

/// <summary>
/// Repository PORT for <c>ThreadSubscription</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IThreadSubscriptionRepository
{
    Task<ThreadSubscription> AddAsync(ThreadSubscription threadSubscription, CancellationToken cancellationToken = default);

    Task<ThreadSubscription?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ThreadSubscription>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
