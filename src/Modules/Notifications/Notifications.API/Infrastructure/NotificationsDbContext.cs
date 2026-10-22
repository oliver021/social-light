namespace SocialLight.Notifications.API.Infrastructure;

/// <summary>
/// DbContext for the "Notifications" module — owns the "notifications" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class NotificationsDbContext(DbContextOptions<NotificationsDbContext> options) : DbContext(options)
{
    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("notifications");
        builder.ApplyConfigurationsFromAssembly(typeof(NotificationsDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
