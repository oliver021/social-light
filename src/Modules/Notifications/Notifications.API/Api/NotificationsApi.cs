namespace SocialLight.Notifications.API.Api;

/// <summary>Maps every entity endpoint group in the "Notifications" module.</summary>
public static class NotificationsApi
{
    public static IEndpointRouteBuilder MapNotificationsApi(this IEndpointRouteBuilder app)
    {
        app.MapNotificationEndpoints();
        return app;
    }
}
