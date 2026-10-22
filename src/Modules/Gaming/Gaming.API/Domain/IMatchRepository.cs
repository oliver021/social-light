namespace SocialLight.Gaming.Domain;

/// <summary>
/// Repository PORT for <c>Match</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IMatchRepository
{
    Task<Match> AddAsync(Match match, CancellationToken cancellationToken = default);

    Task<Match?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Match>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
