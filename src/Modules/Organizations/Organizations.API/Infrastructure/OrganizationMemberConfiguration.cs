namespace SocialLight.Organizations.API.Infrastructure;

/// <summary>EF Core mapping for <c>OrganizationMember</c> (applied by the module DbContext).</summary>
public class OrganizationMemberConfiguration : IEntityTypeConfiguration<OrganizationMember>
{
    public void Configure(EntityTypeBuilder<OrganizationMember> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Role).IsRequired();
    }
}
