namespace SocialLight.Jobs.Domain;

/// <summary>
/// Repository PORT for <c>JobPosition</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IJobPositionRepository
{
    Task<JobPosition> AddAsync(JobPosition jobPosition, CancellationToken cancellationToken = default);

    Task<JobPosition?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<JobPosition>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
