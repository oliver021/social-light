namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>
/// DbContext for the "Recommendation" module — owns the "recommendation" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class RecommendationDbContext(DbContextOptions<RecommendationDbContext> options) : DbContext(options)
{
    public DbSet<UserInterest> UserInterests => Set<UserInterest>();
    public DbSet<ContentScore> ContentScores => Set<ContentScore>();
    public DbSet<FeedRanking> FeedRankings => Set<FeedRanking>();
    public DbSet<RecommendationCandidate> RecommendationCandidates => Set<RecommendationCandidate>();
    public DbSet<TrendingTopic> TrendingTopics => Set<TrendingTopic>();
    public DbSet<Hashtag> Hashtags => Set<Hashtag>();
    public DbSet<Topic> Topics => Set<Topic>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("recommendation");
        builder.ApplyConfigurationsFromAssembly(typeof(RecommendationDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
