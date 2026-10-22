using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Application;

/// <summary>
/// Application service for <c>UserAchievement</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class UserAchievementService(
    IUserAchievementRepository repository,
    ILogger<UserAchievementService> logger)
{
    public Task<UserAchievement?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<UserAchievement>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<UserAchievement> CreateAsync(
        Guid userId,
        Guid achievementId,
        DateTime unlockedAt,
        CancellationToken cancellationToken = default)
    {
        var userAchievement = new UserAchievement(
            userId,
            achievementId,
            unlockedAt
        );

        await repository.AddAsync(userAchievement, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(UserAchievement), userAchievement.Id);
        return userAchievement;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
