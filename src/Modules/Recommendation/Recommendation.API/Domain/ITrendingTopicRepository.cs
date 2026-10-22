namespace SocialLight.Recommendation.Domain;

/// <summary>
/// Repository PORT for <c>TrendingTopic</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface ITrendingTopicRepository
{
    Task<TrendingTopic> AddAsync(TrendingTopic trendingTopic, CancellationToken cancellationToken = default);

    Task<TrendingTopic?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TrendingTopic>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
