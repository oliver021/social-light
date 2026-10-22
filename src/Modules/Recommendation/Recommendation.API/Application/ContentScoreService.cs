using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Application;

/// <summary>
/// Application service for <c>ContentScore</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ContentScoreService(
    IContentScoreRepository repository,
    ILogger<ContentScoreService> logger)
{
    public Task<ContentScore?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<ContentScore>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<ContentScore> CreateAsync(
        string targetType,
        Guid targetId,
        double score,
        DateTime computedAt,
        CancellationToken cancellationToken = default)
    {
        var contentScore = new ContentScore(
            targetType,
            targetId,
            score,
            computedAt
        );

        await repository.AddAsync(contentScore, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(ContentScore), contentScore.Id);
        return contentScore;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
