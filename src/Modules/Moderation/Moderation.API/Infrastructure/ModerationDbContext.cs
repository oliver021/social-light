namespace SocialLight.Moderation.API.Infrastructure;

/// <summary>
/// DbContext for the "Moderation" module — owns the "moderation" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class ModerationDbContext(DbContextOptions<ModerationDbContext> options) : DbContext(options)
{
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<ModerationCase> ModerationCases => Set<ModerationCase>();
    public DbSet<ModerationAction> ModerationActions => Set<ModerationAction>();
    public DbSet<ModerationNote> ModerationNotes => Set<ModerationNote>();
    public DbSet<Appeal> Appeals => Set<Appeal>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("moderation");
        builder.ApplyConfigurationsFromAssembly(typeof(ModerationDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
