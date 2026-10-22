namespace SocialLight.Moderation.API.Api;

/// <summary>Maps every entity endpoint group in the "Moderation" module.</summary>
public static class ModerationApi
{
    public static IEndpointRouteBuilder MapModerationApi(this IEndpointRouteBuilder app)
    {
        app.MapReportEndpoints();
        app.MapModerationCaseEndpoints();
        app.MapModerationActionEndpoints();
        app.MapModerationNoteEndpoints();
        app.MapAppealEndpoints();
        return app;
    }
}
