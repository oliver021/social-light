namespace SocialLight.Jobs.API.Api;

/// <summary>Maps every entity endpoint group in the "Jobs" module.</summary>
public static class JobsApi
{
    public static IEndpointRouteBuilder MapJobsApi(this IEndpointRouteBuilder app)
    {
        app.MapJobCategoryEndpoints();
        app.MapJobPositionEndpoints();
        app.MapJobApplicationEndpoints();
        return app;
    }
}
