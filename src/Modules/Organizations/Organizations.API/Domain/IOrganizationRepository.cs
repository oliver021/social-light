namespace SocialLight.Organizations.Domain;

/// <summary>
/// Repository PORT for <c>Organization</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IOrganizationRepository
{
    Task<Organization> AddAsync(Organization organization, CancellationToken cancellationToken = default);

    Task<Organization?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Organization>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
