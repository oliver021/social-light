using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IFeedRankingRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfFeedRankingRepository(
    RecommendationDbContext context,
    ILogger<EfFeedRankingRepository> logger) : IFeedRankingRepository
{
    public async Task<FeedRanking> AddAsync(FeedRanking feedRanking, CancellationToken cancellationToken = default)
    {
        context.FeedRankings.Add(feedRanking);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(FeedRanking), feedRanking.Id);
        return feedRanking;
    }

    public Task<FeedRanking?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.FeedRankings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<FeedRanking>> ListAsync(CancellationToken cancellationToken = default)
        => await context.FeedRankings.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var feedRanking = await context.FeedRankings.FindAsync([id], cancellationToken);
        if (feedRanking is null)
        {
            return false;
        }

        context.FeedRankings.Remove(feedRanking);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(FeedRanking), id);
        return true;
    }
}
