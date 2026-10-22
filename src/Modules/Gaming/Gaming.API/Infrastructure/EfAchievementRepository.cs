using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IAchievementRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfAchievementRepository(
    GamingDbContext context,
    ILogger<EfAchievementRepository> logger) : IAchievementRepository
{
    public async Task<Achievement> AddAsync(Achievement achievement, CancellationToken cancellationToken = default)
    {
        context.Achievements.Add(achievement);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Achievement), achievement.Id);
        return achievement;
    }

    public Task<Achievement?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Achievements.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Achievement>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Achievements.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var achievement = await context.Achievements.FindAsync([id], cancellationToken);
        if (achievement is null)
        {
            return false;
        }

        context.Achievements.Remove(achievement);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Achievement), id);
        return true;
    }
}
