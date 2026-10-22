namespace SocialLight.Threads.API.Api;

/// <summary>Maps every entity endpoint group in the "Threads" module.</summary>
public static class ThreadsApi
{
    public static IEndpointRouteBuilder MapThreadsApi(this IEndpointRouteBuilder app)
    {
        app.MapThreadEndpoints();
        app.MapThreadReplyEndpoints();
        app.MapThreadSubscriptionEndpoints();
        return app;
    }
}
