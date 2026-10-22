namespace SocialLight.SocialGraph.API.Infrastructure;

/// <summary>EF Core mapping for <c>Friend</c> (applied by the module DbContext).</summary>
public class FriendConfiguration : IEntityTypeConfiguration<Friend>
{
    public void Configure(EntityTypeBuilder<Friend> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Status).IsRequired();
    }
}
