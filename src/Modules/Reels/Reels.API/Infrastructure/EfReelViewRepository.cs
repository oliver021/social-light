using Microsoft.Extensions.Logging;

namespace SocialLight.Reels.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IReelViewRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfReelViewRepository(
    ReelsDbContext context,
    ILogger<EfReelViewRepository> logger) : IReelViewRepository
{
    public async Task<ReelView> AddAsync(ReelView reelView, CancellationToken cancellationToken = default)
    {
        context.ReelViews.Add(reelView);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(ReelView), reelView.Id);
        return reelView;
    }

    public Task<ReelView?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.ReelViews.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ReelView>> ListAsync(CancellationToken cancellationToken = default)
        => await context.ReelViews.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var reelView = await context.ReelViews.FindAsync([id], cancellationToken);
        if (reelView is null)
        {
            return false;
        }

        context.ReelViews.Remove(reelView);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(ReelView), id);
        return true;
    }
}
