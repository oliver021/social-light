namespace SocialLight.Gaming.API.Api;

/// <summary>Maps every entity endpoint group in the "Gaming" module.</summary>
public static class GamingApi
{
    public static IEndpointRouteBuilder MapGamingApi(this IEndpointRouteBuilder app)
    {
        app.MapGameEndpoints();
        app.MapPlayerProfileEndpoints();
        app.MapAchievementEndpoints();
        app.MapUserAchievementEndpoints();
        app.MapTournamentEndpoints();
        app.MapTeamEndpoints();
        app.MapTeamMemberEndpoints();
        app.MapMatchEndpoints();
        app.MapLeaderboardEndpoints();
        return app;
    }
}
