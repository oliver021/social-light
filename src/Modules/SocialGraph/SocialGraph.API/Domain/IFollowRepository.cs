namespace SocialLight.SocialGraph.Domain;

/// <summary>
/// Repository PORT for <c>Follow</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IFollowRepository
{
    Task<Follow> AddAsync(Follow follow, CancellationToken cancellationToken = default);

    Task<Follow?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Follow>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
