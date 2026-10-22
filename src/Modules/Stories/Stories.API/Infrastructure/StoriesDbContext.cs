namespace SocialLight.Stories.API.Infrastructure;

/// <summary>
/// DbContext for the "Stories" module — owns the "stories" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class StoriesDbContext(DbContextOptions<StoriesDbContext> options) : DbContext(options)
{
    public DbSet<Story> Stories => Set<Story>();
    public DbSet<StoryView> StoryViews => Set<StoryView>();
    public DbSet<StoryReply> StoryReplies => Set<StoryReply>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("stories");
        builder.ApplyConfigurationsFromAssembly(typeof(StoriesDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
