namespace SocialLight.Recommendation.API.Api;

/// <summary>Maps every entity endpoint group in the "Recommendation" module.</summary>
public static class RecommendationApi
{
    public static IEndpointRouteBuilder MapRecommendationApi(this IEndpointRouteBuilder app)
    {
        app.MapUserInterestEndpoints();
        app.MapContentScoreEndpoints();
        app.MapFeedRankingEndpoints();
        app.MapRecommendationCandidateEndpoints();
        app.MapTrendingTopicEndpoints();
        app.MapHashtagEndpoints();
        app.MapTopicEndpoints();
        return app;
    }
}
