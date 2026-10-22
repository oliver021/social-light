using Microsoft.Extensions.Logging;

namespace SocialLight.Jobs.API.Application;

/// <summary>
/// Application service for <c>JobPosition</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class JobPositionService(
    IJobPositionRepository repository,
    ILogger<JobPositionService> logger)
{
    public Task<JobPosition?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<JobPosition>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<JobPosition> CreateAsync(
        Guid? jobCategoryId,
        Guid organizationId,
        string title,
        string description,
        string? salaryRange,
        string? location,
        string employmentType,
        CancellationToken cancellationToken = default)
    {
        var jobPosition = new JobPosition(
            jobCategoryId,
            organizationId,
            title,
            description,
            salaryRange,
            location,
            employmentType
        );

        await repository.AddAsync(jobPosition, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(JobPosition), jobPosition.Id);
        return jobPosition;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
