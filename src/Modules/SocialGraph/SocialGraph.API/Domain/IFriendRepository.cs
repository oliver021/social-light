namespace SocialLight.SocialGraph.Domain;

/// <summary>
/// Repository PORT for <c>Friend</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IFriendRepository
{
    Task<Friend> AddAsync(Friend friend, CancellationToken cancellationToken = default);

    Task<Friend?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Friend>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
