namespace SocialLight.Groups.Domain;

/// <summary>
/// Repository PORT for <c>GroupMember</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IGroupMemberRepository
{
    Task<GroupMember> AddAsync(GroupMember groupMember, CancellationToken cancellationToken = default);

    Task<GroupMember?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<GroupMember>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
