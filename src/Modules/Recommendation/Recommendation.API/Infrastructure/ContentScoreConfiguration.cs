namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>EF Core mapping for <c>ContentScore</c> (applied by the module DbContext).</summary>
public class ContentScoreConfiguration : IEntityTypeConfiguration<ContentScore>
{
    public void Configure(EntityTypeBuilder<ContentScore> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TargetType).IsRequired();
    }
}
