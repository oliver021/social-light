namespace SocialLight.Posts.API.Infrastructure;

/// <summary>
/// DbContext for the "Posts" module — owns the "posts" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class PostsDbContext(DbContextOptions<PostsDbContext> options) : DbContext(options)
{
    public DbSet<Post> Posts => Set<Post>();
    public DbSet<PostMedia> PostMedias => Set<PostMedia>();
    public DbSet<PostFeed> PostFeeds => Set<PostFeed>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("posts");
        builder.ApplyConfigurationsFromAssembly(typeof(PostsDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
