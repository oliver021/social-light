using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Application;

/// <summary>
/// Application service for <c>Leaderboard</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class LeaderboardService(
    ILeaderboardRepository repository,
    ILogger<LeaderboardService> logger)
{
    public Task<Leaderboard?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Leaderboard>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Leaderboard> CreateAsync(
        Guid gameId,
        Guid? seasonId,
        CancellationToken cancellationToken = default)
    {
        var leaderboard = new Leaderboard(
            gameId,
            seasonId
        );

        await repository.AddAsync(leaderboard, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Leaderboard), leaderboard.Id);
        return leaderboard;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
