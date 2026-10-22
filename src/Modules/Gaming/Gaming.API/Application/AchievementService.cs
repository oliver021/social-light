using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Application;

/// <summary>
/// Application service for <c>Achievement</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class AchievementService(
    IAchievementRepository repository,
    ILogger<AchievementService> logger)
{
    public Task<Achievement?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Achievement>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Achievement> CreateAsync(
        Guid gameId,
        string title,
        string? description,
        CancellationToken cancellationToken = default)
    {
        var achievement = new Achievement(
            gameId,
            title,
            description
        );

        await repository.AddAsync(achievement, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Achievement), achievement.Id);
        return achievement;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
