namespace SocialLight.Jobs.API.Infrastructure;

/// <summary>
/// DbContext for the "Jobs" module — owns the "jobs" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class JobsDbContext(DbContextOptions<JobsDbContext> options) : DbContext(options)
{
    public DbSet<JobCategory> JobCategories => Set<JobCategory>();
    public DbSet<JobPosition> JobPositions => Set<JobPosition>();
    public DbSet<JobApplication> JobApplications => Set<JobApplication>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("jobs");
        builder.ApplyConfigurationsFromAssembly(typeof(JobsDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
