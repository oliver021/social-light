namespace SocialLight.Organizations.Domain;

/// <summary>
/// Repository PORT for <c>OrganizationMember</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IOrganizationMemberRepository
{
    Task<OrganizationMember> AddAsync(OrganizationMember organizationMember, CancellationToken cancellationToken = default);

    Task<OrganizationMember?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<OrganizationMember>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
