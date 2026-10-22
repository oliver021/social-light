namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>EF Core mapping for <c>TrendingTopic</c> (applied by the module DbContext).</summary>
public class TrendingTopicConfiguration : IEntityTypeConfiguration<TrendingTopic>
{
    public void Configure(EntityTypeBuilder<TrendingTopic> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
