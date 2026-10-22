using Microsoft.Extensions.Logging;

namespace SocialLight.Threads.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IThreadRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfThreadRepository(
    ThreadsDbContext context,
    ILogger<EfThreadRepository> logger) : IThreadRepository
{
    public async Task<global::SocialLight.Threads.Domain.Thread> AddAsync(global::SocialLight.Threads.Domain.Thread thread, CancellationToken cancellationToken = default)
    {
        context.Threads.Add(thread);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(global::SocialLight.Threads.Domain.Thread), thread.Id);
        return thread;
    }

    public Task<global::SocialLight.Threads.Domain.Thread?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Threads.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<global::SocialLight.Threads.Domain.Thread>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Threads.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var thread = await context.Threads.FindAsync([id], cancellationToken);
        if (thread is null)
        {
            return false;
        }

        context.Threads.Remove(thread);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(global::SocialLight.Threads.Domain.Thread), id);
        return true;
    }
}
