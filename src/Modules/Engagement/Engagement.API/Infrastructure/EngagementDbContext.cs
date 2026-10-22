namespace SocialLight.Engagement.API.Infrastructure;

/// <summary>
/// DbContext for the "Engagement" module — owns the "engagement" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class EngagementDbContext(DbContextOptions<EngagementDbContext> options) : DbContext(options)
{
    public DbSet<Reaction> Reactions => Set<Reaction>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Share> Shares => Set<Share>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("engagement");
        builder.ApplyConfigurationsFromAssembly(typeof(EngagementDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
