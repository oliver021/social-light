namespace SocialLight.Threads.API.Infrastructure;

/// <summary>
/// DbContext for the "Threads" module — owns the "threads" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class ThreadsDbContext(DbContextOptions<ThreadsDbContext> options) : DbContext(options)
{
    public DbSet<global::SocialLight.Threads.Domain.Thread> Threads => Set<global::SocialLight.Threads.Domain.Thread>();
    public DbSet<ThreadReply> ThreadReplies => Set<ThreadReply>();
    public DbSet<ThreadSubscription> ThreadSubscriptions => Set<ThreadSubscription>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("threads");
        builder.ApplyConfigurationsFromAssembly(typeof(ThreadsDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
