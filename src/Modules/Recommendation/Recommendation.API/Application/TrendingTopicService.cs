using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Application;

/// <summary>
/// Application service for <c>TrendingTopic</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class TrendingTopicService(
    ITrendingTopicRepository repository,
    ILogger<TrendingTopicService> logger)
{
    public Task<TrendingTopic?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<TrendingTopic>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<TrendingTopic> CreateAsync(
        Guid topicId,
        string? region,
        double score,
        CancellationToken cancellationToken = default)
    {
        var trendingTopic = new TrendingTopic(
            topicId,
            region,
            score
        );

        await repository.AddAsync(trendingTopic, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(TrendingTopic), trendingTopic.Id);
        return trendingTopic;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
