namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>EF Core mapping for <c>TeamMember</c> (applied by the module DbContext).</summary>
public class TeamMemberConfiguration : IEntityTypeConfiguration<TeamMember>
{
    public void Configure(EntityTypeBuilder<TeamMember> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Role).IsRequired();
    }
}
