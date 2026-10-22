namespace SocialLight.Pages.API.Infrastructure;

/// <summary>EF Core mapping for <c>Page</c> (applied by the module DbContext).</summary>
public class PageConfiguration : IEntityTypeConfiguration<Page>
{
    public void Configure(EntityTypeBuilder<Page> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired();
        builder.Property(x => x.Category).IsRequired();
        builder.Property(x => x.VerificationStatus).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because PageRole is in this module.
        builder.HasMany(x => x.PageRoles).WithOne();
    }
}
