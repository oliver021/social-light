using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="ILeaderboardRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfLeaderboardRepository(
    GamingDbContext context,
    ILogger<EfLeaderboardRepository> logger) : ILeaderboardRepository
{
    public async Task<Leaderboard> AddAsync(Leaderboard leaderboard, CancellationToken cancellationToken = default)
    {
        context.Leaderboards.Add(leaderboard);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Leaderboard), leaderboard.Id);
        return leaderboard;
    }

    public Task<Leaderboard?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Leaderboards.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Leaderboard>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Leaderboards.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var leaderboard = await context.Leaderboards.FindAsync([id], cancellationToken);
        if (leaderboard is null)
        {
            return false;
        }

        context.Leaderboards.Remove(leaderboard);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Leaderboard), id);
        return true;
    }
}
