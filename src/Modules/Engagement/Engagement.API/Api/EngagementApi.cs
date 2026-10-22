namespace SocialLight.Engagement.API.Api;

/// <summary>Maps every entity endpoint group in the "Engagement" module.</summary>
public static class EngagementApi
{
    public static IEndpointRouteBuilder MapEngagementApi(this IEndpointRouteBuilder app)
    {
        app.MapReactionEndpoints();
        app.MapCommentEndpoints();
        app.MapShareEndpoints();
        return app;
    }
}
