namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>EF Core mapping for <c>RecommendationCandidate</c> (applied by the module DbContext).</summary>
public class RecommendationCandidateConfiguration : IEntityTypeConfiguration<RecommendationCandidate>
{
    public void Configure(EntityTypeBuilder<RecommendationCandidate> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.TargetType).IsRequired();
        builder.Property(x => x.Source).IsRequired();
    }
}
