namespace SocialLight.Groups.API.Api;

/// <summary>Maps every entity endpoint group in the "Groups" module.</summary>
public static class GroupsApi
{
    public static IEndpointRouteBuilder MapGroupsApi(this IEndpointRouteBuilder app)
    {
        app.MapGroupEndpoints();
        app.MapGroupMemberEndpoints();
        return app;
    }
}
