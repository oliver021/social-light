namespace SocialLight.Jobs.API.Infrastructure;

/// <summary>EF Core mapping for <c>JobPosition</c> (applied by the module DbContext).</summary>
public class JobPositionConfiguration : IEntityTypeConfiguration<JobPosition>
{
    public void Configure(EntityTypeBuilder<JobPosition> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Title).IsRequired();
        builder.Property(x => x.Description).IsRequired();
        builder.Property(x => x.EmploymentType).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because JobApplication is in this module.
        builder.HasMany(x => x.JobApplications).WithOne();
    }
}
