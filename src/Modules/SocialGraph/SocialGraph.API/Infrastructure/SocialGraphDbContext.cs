namespace SocialLight.SocialGraph.API.Infrastructure;

/// <summary>
/// DbContext for the "SocialGraph" module — owns the "social_graph" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class SocialGraphDbContext(DbContextOptions<SocialGraphDbContext> options) : DbContext(options)
{
    public DbSet<Follow> Follows => Set<Follow>();
    public DbSet<Friend> Friends => Set<Friend>();
    public DbSet<Block> Blocks => Set<Block>();
    public DbSet<UserPreference> UserPreferences => Set<UserPreference>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("social_graph");
        builder.ApplyConfigurationsFromAssembly(typeof(SocialGraphDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
