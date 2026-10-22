using Microsoft.Extensions.Logging;

namespace SocialLight.Jobs.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IJobApplicationRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfJobApplicationRepository(
    JobsDbContext context,
    ILogger<EfJobApplicationRepository> logger) : IJobApplicationRepository
{
    public async Task<JobApplication> AddAsync(JobApplication jobApplication, CancellationToken cancellationToken = default)
    {
        context.JobApplications.Add(jobApplication);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(JobApplication), jobApplication.Id);
        return jobApplication;
    }

    public Task<JobApplication?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.JobApplications.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<JobApplication>> ListAsync(CancellationToken cancellationToken = default)
        => await context.JobApplications.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var jobApplication = await context.JobApplications.FindAsync([id], cancellationToken);
        if (jobApplication is null)
        {
            return false;
        }

        context.JobApplications.Remove(jobApplication);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(JobApplication), id);
        return true;
    }
}
