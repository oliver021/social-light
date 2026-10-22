namespace SocialLight.Groups.Domain;

/// <summary>
/// Repository PORT for <c>Group</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IGroupRepository
{
    Task<Group> AddAsync(Group group, CancellationToken cancellationToken = default);

    Task<Group?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Group>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
