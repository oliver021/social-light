namespace SocialLight.Organizations.API.Infrastructure;

/// <summary>EF Core mapping for <c>Organization</c> (applied by the module DbContext).</summary>
public class OrganizationConfiguration : IEntityTypeConfiguration<Organization>
{
    public void Configure(EntityTypeBuilder<Organization> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired();
        builder.Property(x => x.VerificationStatus).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because OrganizationMember is in this module.
        builder.HasMany(x => x.OrganizationMembers).WithOne();
    }
}
