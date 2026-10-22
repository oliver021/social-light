namespace SocialLight.Moderation.API.Infrastructure;

/// <summary>EF Core mapping for <c>Report</c> (applied by the module DbContext).</summary>
public class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TargetType).IsRequired();
        builder.Property(x => x.Category).IsRequired();
        builder.Property(x => x.Status).IsRequired();
    }
}
