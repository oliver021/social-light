namespace SocialLight.Gaming.Domain;

/// <summary>
/// Repository PORT for <c>TeamMember</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface ITeamMemberRepository
{
    Task<TeamMember> AddAsync(TeamMember teamMember, CancellationToken cancellationToken = default);

    Task<TeamMember?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TeamMember>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
