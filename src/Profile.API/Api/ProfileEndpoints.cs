namespace SocialLight.Profile.API.Api;

/// <summary>
/// HTTP endpoints for profiles (versioned minimal APIs, same shape as the generated
/// modules). All require auth; <c>/me</c> resolves the caller from the JWT sub, so
/// a user can only edit their own profile — ownership is never taken from the body.
/// </summary>
public static class ProfileEndpoints
{
    public static IEndpointRouteBuilder MapProfileEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Profiles")
            .MapGroup("/api/profiles")
            .HasApiVersion(1, 0);

        api.RequireAuthorization();

        api.MapGet("/", ListAll)
            .WithName("ListProfiles")
            .WithSummary("List profiles to discover (excludes the caller)")
            .WithTags("Profiles");

        api.MapGet("/me", GetMine)
            .WithName("GetMyProfile")
            .WithSummary("Get the authenticated user's profile")
            .WithTags("Profiles");

        api.MapPut("/me", EditMine)
            .WithName("EditMyProfile")
            .WithSummary("Create or update the authenticated user's profile")
            .WithTags("Profiles");

        api.MapGet("/{userId:guid}", GetByUserId)
            .WithName("GetProfile")
            .WithSummary("Get a user's profile by id")
            .WithTags("Profiles");

        return app;
    }

    private static async Task<Ok<IReadOnlyList<ProfileDto>>> ListAll(
        ClaimsPrincipal user, ProfileService service, CancellationToken cancellationToken)
    {
        var me = CurrentUserId(user);
        var profiles = await service.ListAsync(me, take: 50, cancellationToken);
        return TypedResults.Ok(profiles);
    }

    private static async Task<Results<Ok<ProfileDto>, NotFound>> GetByUserId(
        Guid userId, ProfileService service, CancellationToken cancellationToken)
    {
        var profile = await service.GetAsync(userId, cancellationToken);
        return profile is null ? TypedResults.NotFound() : TypedResults.Ok(profile);
    }

    private static async Task<Results<Ok<ProfileDto>, NotFound>> GetMine(
        ClaimsPrincipal user, ProfileService service, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId(user);
        var profile = await service.GetAsync(userId, cancellationToken);
        return profile is null ? TypedResults.NotFound() : TypedResults.Ok(profile);
    }

    private static async Task<Ok<ProfileDto>> EditMine(
        UpdateProfileRequest request, ClaimsPrincipal user, ProfileService service, CancellationToken cancellationToken)
    {
        var userId = CurrentUserId(user);
        var profile = await service.EditAsync(userId, request, cancellationToken);
        return TypedResults.Ok(profile);
    }

    private static Guid CurrentUserId(ClaimsPrincipal user) =>
        Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
}
