using Microsoft.Extensions.Logging;

namespace SocialLight.SocialGraph.API.Application;

/// <summary>
/// Application service for <c>Follow</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class FollowService(
    IFollowRepository repository,
    ILogger<FollowService> logger)
{
    public Task<Follow?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Follow>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Follow> CreateAsync(
        Guid followerId,
        Guid followingId,
        string status,
        DateTime createdAt,
        CancellationToken cancellationToken = default)
    {
        var follow = new Follow(
            followerId,
            followingId,
            status,
            createdAt
        );

        await repository.AddAsync(follow, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Follow), follow.Id);
        return follow;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
