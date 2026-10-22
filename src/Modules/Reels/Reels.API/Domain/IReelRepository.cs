namespace SocialLight.Reels.Domain;

/// <summary>
/// Repository PORT for <c>Reel</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IReelRepository
{
    Task<Reel> AddAsync(Reel reel, CancellationToken cancellationToken = default);

    Task<Reel?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Reel>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
