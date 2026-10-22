namespace SocialLight.Jobs.Domain;

/// <summary>
/// Repository PORT for <c>JobCategory</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IJobCategoryRepository
{
    Task<JobCategory> AddAsync(JobCategory jobCategory, CancellationToken cancellationToken = default);

    Task<JobCategory?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<JobCategory>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
