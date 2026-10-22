namespace SocialLight.Pages.Domain;

/// <summary>
/// Repository PORT for <c>Page</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IPageRepository
{
    Task<Page> AddAsync(Page page, CancellationToken cancellationToken = default);

    Task<Page?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Page>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
