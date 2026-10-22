using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IRecommendationCandidateRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfRecommendationCandidateRepository(
    RecommendationDbContext context,
    ILogger<EfRecommendationCandidateRepository> logger) : IRecommendationCandidateRepository
{
    public async Task<RecommendationCandidate> AddAsync(RecommendationCandidate recommendationCandidate, CancellationToken cancellationToken = default)
    {
        context.RecommendationCandidates.Add(recommendationCandidate);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(RecommendationCandidate), recommendationCandidate.Id);
        return recommendationCandidate;
    }

    public Task<RecommendationCandidate?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.RecommendationCandidates.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<RecommendationCandidate>> ListAsync(CancellationToken cancellationToken = default)
        => await context.RecommendationCandidates.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var recommendationCandidate = await context.RecommendationCandidates.FindAsync([id], cancellationToken);
        if (recommendationCandidate is null)
        {
            return false;
        }

        context.RecommendationCandidates.Remove(recommendationCandidate);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(RecommendationCandidate), id);
        return true;
    }
}
