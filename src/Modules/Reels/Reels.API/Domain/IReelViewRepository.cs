namespace SocialLight.Reels.Domain;

/// <summary>
/// Repository PORT for <c>ReelView</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IReelViewRepository
{
    Task<ReelView> AddAsync(ReelView reelView, CancellationToken cancellationToken = default);

    Task<ReelView?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ReelView>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
