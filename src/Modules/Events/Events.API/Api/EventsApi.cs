namespace SocialLight.Events.API.Api;

/// <summary>Maps every entity endpoint group in the "Events" module.</summary>
public static class EventsApi
{
    public static IEndpointRouteBuilder MapEventsApi(this IEndpointRouteBuilder app)
    {
        app.MapEventEndpoints();
        app.MapEventAttendanceEndpoints();
        return app;
    }
}
