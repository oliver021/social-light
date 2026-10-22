namespace SocialLight.Events.API.Infrastructure;

/// <summary>EF Core mapping for <c>EventAttendance</c> (applied by the module DbContext).</summary>
public class EventAttendanceConfiguration : IEntityTypeConfiguration<EventAttendance>
{
    public void Configure(EntityTypeBuilder<EventAttendance> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Status).IsRequired();
    }
}
