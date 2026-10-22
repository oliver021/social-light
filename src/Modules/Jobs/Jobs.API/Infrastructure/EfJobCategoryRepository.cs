using Microsoft.Extensions.Logging;

namespace SocialLight.Jobs.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IJobCategoryRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfJobCategoryRepository(
    JobsDbContext context,
    ILogger<EfJobCategoryRepository> logger) : IJobCategoryRepository
{
    public async Task<JobCategory> AddAsync(JobCategory jobCategory, CancellationToken cancellationToken = default)
    {
        context.JobCategories.Add(jobCategory);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(JobCategory), jobCategory.Id);
        return jobCategory;
    }

    public Task<JobCategory?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.JobCategories.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<JobCategory>> ListAsync(CancellationToken cancellationToken = default)
        => await context.JobCategories.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var jobCategory = await context.JobCategories.FindAsync([id], cancellationToken);
        if (jobCategory is null)
        {
            return false;
        }

        context.JobCategories.Remove(jobCategory);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(JobCategory), id);
        return true;
    }
}
