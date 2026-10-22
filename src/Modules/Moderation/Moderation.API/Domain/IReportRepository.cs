namespace SocialLight.Moderation.Domain;

/// <summary>
/// Repository PORT for <c>Report</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IReportRepository
{
    Task<Report> AddAsync(Report report, CancellationToken cancellationToken = default);

    Task<Report?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Report>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
