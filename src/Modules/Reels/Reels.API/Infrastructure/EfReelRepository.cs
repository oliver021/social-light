using Microsoft.Extensions.Logging;

namespace SocialLight.Reels.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IReelRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfReelRepository(
    ReelsDbContext context,
    ILogger<EfReelRepository> logger) : IReelRepository
{
    public async Task<Reel> AddAsync(Reel reel, CancellationToken cancellationToken = default)
    {
        context.Reels.Add(reel);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Reel), reel.Id);
        return reel;
    }

    public Task<Reel?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Reels.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Reel>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Reels.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var reel = await context.Reels.FindAsync([id], cancellationToken);
        if (reel is null)
        {
            return false;
        }

        context.Reels.Remove(reel);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Reel), id);
        return true;
    }
}
