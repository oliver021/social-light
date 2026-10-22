namespace SocialLight.Recommendation.API;

/// <summary>
/// The single line the host needs to adopt this module (DESIGN-STRATEGY.md §4):
/// it registers the module's PORTS (repositories), application services, and
/// schema initializer. It deliberately does NOT bind the database or the broker —
/// those are the host's job — so the module never sees a connection string.
/// </summary>
public static class RecommendationModuleExtensions
{
    public static IServiceCollection AddRecommendationModule(this IServiceCollection services)
    {
        // Ports → adapters (dependency inversion; the adapter is swappable).
        services.AddScoped<IUserInterestRepository, EfUserInterestRepository>();
        services.AddScoped<IContentScoreRepository, EfContentScoreRepository>();
        services.AddScoped<IFeedRankingRepository, EfFeedRankingRepository>();
        services.AddScoped<IRecommendationCandidateRepository, EfRecommendationCandidateRepository>();
        services.AddScoped<ITrendingTopicRepository, EfTrendingTopicRepository>();
        services.AddScoped<IHashtagRepository, EfHashtagRepository>();
        services.AddScoped<ITopicRepository, EfTopicRepository>();

        // Application services.
        services.AddScoped<UserInterestService>();
        services.AddScoped<ContentScoreService>();
        services.AddScoped<FeedRankingService>();
        services.AddScoped<RecommendationCandidateService>();
        services.AddScoped<TrendingTopicService>();
        services.AddScoped<HashtagService>();
        services.AddScoped<TopicService>();

        // Schema initialization (EnsureCreated; per-module EF migrations are the
        // intended successor — DESIGN-STRATEGY.md §10).
        services.AddHostedService<RecommendationDbInitializer>();

        return services;
    }
}
