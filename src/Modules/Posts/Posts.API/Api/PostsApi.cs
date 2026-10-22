namespace SocialLight.Posts.API.Api;

/// <summary>Maps every entity endpoint group in the "Posts" module.</summary>
public static class PostsApi
{
    public static IEndpointRouteBuilder MapPostsApi(this IEndpointRouteBuilder app)
    {
        app.MapPostEndpoints();
        app.MapPostMediaEndpoints();
        app.MapPostFeedEndpoints();
        return app;
    }
}
