using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="ITrendingTopicRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfTrendingTopicRepository(
    RecommendationDbContext context,
    ILogger<EfTrendingTopicRepository> logger) : ITrendingTopicRepository
{
    public async Task<TrendingTopic> AddAsync(TrendingTopic trendingTopic, CancellationToken cancellationToken = default)
    {
        context.TrendingTopics.Add(trendingTopic);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(TrendingTopic), trendingTopic.Id);
        return trendingTopic;
    }

    public Task<TrendingTopic?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.TrendingTopics.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<TrendingTopic>> ListAsync(CancellationToken cancellationToken = default)
        => await context.TrendingTopics.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var trendingTopic = await context.TrendingTopics.FindAsync([id], cancellationToken);
        if (trendingTopic is null)
        {
            return false;
        }

        context.TrendingTopics.Remove(trendingTopic);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(TrendingTopic), id);
        return true;
    }
}
