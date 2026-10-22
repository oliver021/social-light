namespace SocialLight.Gaming.Domain;

/// <summary>
/// Repository PORT for <c>Game</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IGameRepository
{
    Task<Game> AddAsync(Game game, CancellationToken cancellationToken = default);

    Task<Game?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Game>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
