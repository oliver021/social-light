namespace SocialLight.Notifications.API.Infrastructure;

/// <summary>EF Core mapping for <c>Notification</c> (applied by the module DbContext).</summary>
public class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Type).IsRequired();
        builder.Property(x => x.EntityType).IsRequired();
    }
}
