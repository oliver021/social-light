namespace SocialLight.Jobs.API.Infrastructure;

/// <summary>EF Core mapping for <c>JobApplication</c> (applied by the module DbContext).</summary>
public class JobApplicationConfiguration : IEntityTypeConfiguration<JobApplication>
{
    public void Configure(EntityTypeBuilder<JobApplication> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Status).IsRequired();
    }
}
