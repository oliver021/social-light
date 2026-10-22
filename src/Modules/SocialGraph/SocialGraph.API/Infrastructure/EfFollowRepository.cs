using Microsoft.Extensions.Logging;

namespace SocialLight.SocialGraph.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IFollowRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfFollowRepository(
    SocialGraphDbContext context,
    ILogger<EfFollowRepository> logger) : IFollowRepository
{
    public async Task<Follow> AddAsync(Follow follow, CancellationToken cancellationToken = default)
    {
        context.Follows.Add(follow);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Follow), follow.Id);
        return follow;
    }

    public Task<Follow?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Follows.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Follow>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Follows.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var follow = await context.Follows.FindAsync([id], cancellationToken);
        if (follow is null)
        {
            return false;
        }

        context.Follows.Remove(follow);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Follow), id);
        return true;
    }
}
