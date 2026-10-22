namespace SocialLight.SocialGraph.API.Api;

/// <summary>Maps every entity endpoint group in the "SocialGraph" module.</summary>
public static class SocialGraphApi
{
    public static IEndpointRouteBuilder MapSocialGraphApi(this IEndpointRouteBuilder app)
    {
        app.MapFollowEndpoints();
        app.MapFriendEndpoints();
        app.MapBlockEndpoints();
        app.MapUserPreferenceEndpoints();
        return app;
    }
}
