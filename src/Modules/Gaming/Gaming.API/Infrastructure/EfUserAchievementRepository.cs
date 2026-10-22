using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IUserAchievementRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfUserAchievementRepository(
    GamingDbContext context,
    ILogger<EfUserAchievementRepository> logger) : IUserAchievementRepository
{
    public async Task<UserAchievement> AddAsync(UserAchievement userAchievement, CancellationToken cancellationToken = default)
    {
        context.UserAchievements.Add(userAchievement);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(UserAchievement), userAchievement.Id);
        return userAchievement;
    }

    public Task<UserAchievement?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.UserAchievements.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<UserAchievement>> ListAsync(CancellationToken cancellationToken = default)
        => await context.UserAchievements.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userAchievement = await context.UserAchievements.FindAsync([id], cancellationToken);
        if (userAchievement is null)
        {
            return false;
        }

        context.UserAchievements.Remove(userAchievement);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(UserAchievement), id);
        return true;
    }
}
