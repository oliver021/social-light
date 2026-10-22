using Microsoft.Extensions.Logging;

namespace SocialLight.Moderation.API.Application;

/// <summary>
/// Application service for <c>Report</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ReportService(
    IReportRepository repository,
    ILogger<ReportService> logger)
{
    public Task<Report?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Report>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Report> CreateAsync(
        Guid reporterId,
        string targetType,
        Guid targetId,
        string category,
        string status,
        CancellationToken cancellationToken = default)
    {
        var report = new Report(
            reporterId,
            targetType,
            targetId,
            category,
            status
        );

        await repository.AddAsync(report, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Report), report.Id);
        return report;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
