using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Application;

/// <summary>
/// Application service for <c>FeedRanking</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class FeedRankingService(
    IFeedRankingRepository repository,
    ILogger<FeedRankingService> logger)
{
    public Task<FeedRanking?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<FeedRanking>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<FeedRanking> CreateAsync(
        Guid userId,
        string targetType,
        Guid targetId,
        int rank,
        CancellationToken cancellationToken = default)
    {
        var feedRanking = new FeedRanking(
            userId,
            targetType,
            targetId,
            rank
        );

        await repository.AddAsync(feedRanking, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(FeedRanking), feedRanking.Id);
        return feedRanking;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
