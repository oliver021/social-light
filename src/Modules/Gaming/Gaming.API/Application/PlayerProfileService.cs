using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Application;

/// <summary>
/// Application service for <c>PlayerProfile</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class PlayerProfileService(
    IPlayerProfileRepository repository,
    ILogger<PlayerProfileService> logger)
{
    public Task<PlayerProfile?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<PlayerProfile>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<PlayerProfile> CreateAsync(
        Guid userId,
        string nickname,
        int ranking,
        int level,
        CancellationToken cancellationToken = default)
    {
        var playerProfile = new PlayerProfile(
            userId,
            nickname,
            ranking,
            level
        );

        await repository.AddAsync(playerProfile, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(PlayerProfile), playerProfile.Id);
        return playerProfile;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
