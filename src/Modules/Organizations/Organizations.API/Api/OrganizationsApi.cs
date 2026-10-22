namespace SocialLight.Organizations.API.Api;

/// <summary>Maps every entity endpoint group in the "Organizations" module.</summary>
public static class OrganizationsApi
{
    public static IEndpointRouteBuilder MapOrganizationsApi(this IEndpointRouteBuilder app)
    {
        app.MapOrganizationEndpoints();
        app.MapOrganizationMemberEndpoints();
        return app;
    }
}
