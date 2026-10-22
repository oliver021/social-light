namespace SocialLight.Reels.API.Api;

/// <summary>Maps every entity endpoint group in the "Reels" module.</summary>
public static class ReelsApi
{
    public static IEndpointRouteBuilder MapReelsApi(this IEndpointRouteBuilder app)
    {
        app.MapReelEndpoints();
        app.MapReelViewEndpoints();
        return app;
    }
}
