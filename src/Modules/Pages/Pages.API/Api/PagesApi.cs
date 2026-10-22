namespace SocialLight.Pages.API.Api;

/// <summary>Maps every entity endpoint group in the "Pages" module.</summary>
public static class PagesApi
{
    public static IEndpointRouteBuilder MapPagesApi(this IEndpointRouteBuilder app)
    {
        app.MapPageEndpoints();
        app.MapPageRoleEndpoints();
        return app;
    }
}
