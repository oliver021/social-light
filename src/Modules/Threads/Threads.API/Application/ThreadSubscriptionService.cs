using Microsoft.Extensions.Logging;

namespace SocialLight.Threads.API.Application;

/// <summary>
/// Application service for <c>ThreadSubscription</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ThreadSubscriptionService(
    IThreadSubscriptionRepository repository,
    ILogger<ThreadSubscriptionService> logger)
{
    public Task<ThreadSubscription?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<ThreadSubscription>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<ThreadSubscription> CreateAsync(
        Guid threadId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var threadSubscription = new ThreadSubscription(
            threadId,
            userId
        );

        await repository.AddAsync(threadSubscription, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(ThreadSubscription), threadSubscription.Id);
        return threadSubscription;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
