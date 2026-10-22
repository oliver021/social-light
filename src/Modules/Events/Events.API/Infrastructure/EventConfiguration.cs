namespace SocialLight.Events.API.Infrastructure;

/// <summary>EF Core mapping for <c>Event</c> (applied by the module DbContext).</summary>
public class EventConfiguration : IEntityTypeConfiguration<Event>
{
    public void Configure(EntityTypeBuilder<Event> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).IsRequired();
        builder.Property(x => x.Visibility).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because EventAttendance is in this module.
        builder.HasMany(x => x.EventAttendances).WithOne();
    }
}
