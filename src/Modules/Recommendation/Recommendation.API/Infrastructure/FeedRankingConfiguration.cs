namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>EF Core mapping for <c>FeedRanking</c> (applied by the module DbContext).</summary>
public class FeedRankingConfiguration : IEntityTypeConfiguration<FeedRanking>
{
    public void Configure(EntityTypeBuilder<FeedRanking> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TargetType).IsRequired();
    }
}
