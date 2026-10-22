using Microsoft.Extensions.Logging;

namespace SocialLight.Jobs.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IJobPositionRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfJobPositionRepository(
    JobsDbContext context,
    ILogger<EfJobPositionRepository> logger) : IJobPositionRepository
{
    public async Task<JobPosition> AddAsync(JobPosition jobPosition, CancellationToken cancellationToken = default)
    {
        context.JobPositions.Add(jobPosition);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(JobPosition), jobPosition.Id);
        return jobPosition;
    }

    public Task<JobPosition?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.JobPositions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<JobPosition>> ListAsync(CancellationToken cancellationToken = default)
        => await context.JobPositions.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var jobPosition = await context.JobPositions.FindAsync([id], cancellationToken);
        if (jobPosition is null)
        {
            return false;
        }

        context.JobPositions.Remove(jobPosition);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(JobPosition), id);
        return true;
    }
}
