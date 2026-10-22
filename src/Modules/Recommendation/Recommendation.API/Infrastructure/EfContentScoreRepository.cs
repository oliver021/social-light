using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IContentScoreRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfContentScoreRepository(
    RecommendationDbContext context,
    ILogger<EfContentScoreRepository> logger) : IContentScoreRepository
{
    public async Task<ContentScore> AddAsync(ContentScore contentScore, CancellationToken cancellationToken = default)
    {
        context.ContentScores.Add(contentScore);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(ContentScore), contentScore.Id);
        return contentScore;
    }

    public Task<ContentScore?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.ContentScores.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ContentScore>> ListAsync(CancellationToken cancellationToken = default)
        => await context.ContentScores.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var contentScore = await context.ContentScores.FindAsync([id], cancellationToken);
        if (contentScore is null)
        {
            return false;
        }

        context.ContentScores.Remove(contentScore);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(ContentScore), id);
        return true;
    }
}
