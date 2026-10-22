namespace SocialLight.Pages.API.Infrastructure;

/// <summary>
/// DbContext for the "Pages" module — owns the "pages" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class PagesDbContext(DbContextOptions<PagesDbContext> options) : DbContext(options)
{
    public DbSet<Page> Pages => Set<Page>();
    public DbSet<PageRole> PageRoles => Set<PageRole>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("pages");
        builder.ApplyConfigurationsFromAssembly(typeof(PagesDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
