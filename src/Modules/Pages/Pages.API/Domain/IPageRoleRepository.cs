namespace SocialLight.Pages.Domain;

/// <summary>
/// Repository PORT for <c>PageRole</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IPageRoleRepository
{
    Task<PageRole> AddAsync(PageRole pageRole, CancellationToken cancellationToken = default);

    Task<PageRole?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PageRole>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
