using Microsoft.Extensions.Logging;

namespace SocialLight.Threads.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IThreadSubscriptionRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfThreadSubscriptionRepository(
    ThreadsDbContext context,
    ILogger<EfThreadSubscriptionRepository> logger) : IThreadSubscriptionRepository
{
    public async Task<ThreadSubscription> AddAsync(ThreadSubscription threadSubscription, CancellationToken cancellationToken = default)
    {
        context.ThreadSubscriptions.Add(threadSubscription);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(ThreadSubscription), threadSubscription.Id);
        return threadSubscription;
    }

    public Task<ThreadSubscription?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.ThreadSubscriptions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ThreadSubscription>> ListAsync(CancellationToken cancellationToken = default)
        => await context.ThreadSubscriptions.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var threadSubscription = await context.ThreadSubscriptions.FindAsync([id], cancellationToken);
        if (threadSubscription is null)
        {
            return false;
        }

        context.ThreadSubscriptions.Remove(threadSubscription);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(ThreadSubscription), id);
        return true;
    }
}
