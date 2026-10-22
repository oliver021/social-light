namespace SocialLight.Reels.API.Infrastructure;

/// <summary>
/// DbContext for the "Reels" module — owns the "reels" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class ReelsDbContext(DbContextOptions<ReelsDbContext> options) : DbContext(options)
{
    public DbSet<Reel> Reels => Set<Reel>();
    public DbSet<ReelView> ReelViews => Set<ReelView>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("reels");
        builder.ApplyConfigurationsFromAssembly(typeof(ReelsDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
