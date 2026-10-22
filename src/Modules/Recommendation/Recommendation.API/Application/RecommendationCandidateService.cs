using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Application;

/// <summary>
/// Application service for <c>RecommendationCandidate</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class RecommendationCandidateService(
    IRecommendationCandidateRepository repository,
    ILogger<RecommendationCandidateService> logger)
{
    public Task<RecommendationCandidate?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<RecommendationCandidate>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<RecommendationCandidate> CreateAsync(
        Guid userId,
        string targetType,
        Guid targetId,
        string source,
        CancellationToken cancellationToken = default)
    {
        var recommendationCandidate = new RecommendationCandidate(
            userId,
            targetType,
            targetId,
            source
        );

        await repository.AddAsync(recommendationCandidate, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(RecommendationCandidate), recommendationCandidate.Id);
        return recommendationCandidate;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
