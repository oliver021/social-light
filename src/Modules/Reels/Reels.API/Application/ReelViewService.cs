using Microsoft.Extensions.Logging;

namespace SocialLight.Reels.API.Application;

/// <summary>
/// Application service for <c>ReelView</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ReelViewService(
    IReelViewRepository repository,
    ILogger<ReelViewService> logger)
{
    public Task<ReelView?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<ReelView>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<ReelView> CreateAsync(
        Guid reelId,
        Guid viewerId,
        DateTime viewedAt,
        CancellationToken cancellationToken = default)
    {
        var reelView = new ReelView(
            reelId,
            viewerId,
            viewedAt
        );

        await repository.AddAsync(reelView, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(ReelView), reelView.Id);
        return reelView;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
