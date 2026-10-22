using Microsoft.Extensions.Logging;

namespace SocialLight.Jobs.API.Application;

/// <summary>
/// Application service for <c>JobCategory</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class JobCategoryService(
    IJobCategoryRepository repository,
    ILogger<JobCategoryService> logger)
{
    public Task<JobCategory?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<JobCategory>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<JobCategory> CreateAsync(
        string name,
        CancellationToken cancellationToken = default)
    {
        var jobCategory = new JobCategory(
            name
        );

        await repository.AddAsync(jobCategory, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(JobCategory), jobCategory.Id);
        return jobCategory;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
