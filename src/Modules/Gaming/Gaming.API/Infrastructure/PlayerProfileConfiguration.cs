namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>EF Core mapping for <c>PlayerProfile</c> (applied by the module DbContext).</summary>
public class PlayerProfileConfiguration : IEntityTypeConfiguration<PlayerProfile>
{
    public void Configure(EntityTypeBuilder<PlayerProfile> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Nickname).IsRequired();
    }
}
