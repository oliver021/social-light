namespace SocialLight.Pages.API.Infrastructure;

/// <summary>EF Core mapping for <c>PageRole</c> (applied by the module DbContext).</summary>
public class PageRoleConfiguration : IEntityTypeConfiguration<PageRole>
{
    public void Configure(EntityTypeBuilder<PageRole> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Role).IsRequired();
    }
}
