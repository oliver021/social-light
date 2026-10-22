namespace SocialLight.Engagement.Domain;

/// <summary>
/// Repository PORT for <c>Share</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IShareRepository
{
    Task<Share> AddAsync(Share share, CancellationToken cancellationToken = default);

    Task<Share?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Share>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
