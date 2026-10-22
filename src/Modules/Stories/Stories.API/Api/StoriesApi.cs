namespace SocialLight.Stories.API.Api;

/// <summary>Maps every entity endpoint group in the "Stories" module.</summary>
public static class StoriesApi
{
    public static IEndpointRouteBuilder MapStoriesApi(this IEndpointRouteBuilder app)
    {
        app.MapStoryEndpoints();
        app.MapStoryViewEndpoints();
        app.MapStoryReplyEndpoints();
        return app;
    }
}
