namespace SocialLight.SocialGraph.API.Infrastructure;

/// <summary>EF Core mapping for <c>UserPreference</c> (applied by the module DbContext).</summary>
public class UserPreferenceConfiguration : IEntityTypeConfiguration<UserPreference>
{
    public void Configure(EntityTypeBuilder<UserPreference> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.EntityType).IsRequired();
        builder.Property(x => x.PreferenceType).IsRequired();
    }
}
