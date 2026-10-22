namespace SocialLight.Events.API.Infrastructure;

/// <summary>
/// DbContext for the "Events" module — owns the "events" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class EventsDbContext(DbContextOptions<EventsDbContext> options) : DbContext(options)
{
    public DbSet<Event> Events => Set<Event>();
    public DbSet<EventAttendance> EventAttendances => Set<EventAttendance>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("events");
        builder.ApplyConfigurationsFromAssembly(typeof(EventsDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
