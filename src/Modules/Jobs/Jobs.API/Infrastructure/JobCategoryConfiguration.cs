namespace SocialLight.Jobs.API.Infrastructure;

/// <summary>EF Core mapping for <c>JobCategory</c> (applied by the module DbContext).</summary>
public class JobCategoryConfiguration : IEntityTypeConfiguration<JobCategory>
{
    public void Configure(EntityTypeBuilder<JobCategory> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because JobPosition is in this module.
        builder.HasMany(x => x.JobPositions).WithOne();
    }
}
