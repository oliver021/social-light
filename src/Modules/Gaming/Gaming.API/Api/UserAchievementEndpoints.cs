namespace SocialLight.Gaming.API.Api;

/// <summary>
/// HTTP endpoints for <c>UserAchievement</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class UserAchievementEndpoints
{
    public static IEndpointRouteBuilder MapUserAchievementEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("UserAchievements")
            .MapGroup("/api/user-achievements")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListUserAchievements")
            .WithSummary("List userAchievements")
            .WithTags("UserAchievements");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetUserAchievement")
            .WithSummary("Get a userAchievement by id")
            .WithTags("UserAchievements");

        api.MapPost("/", Create)
            .WithName("CreateUserAchievement")
            .WithSummary("Create a userAchievement")
            .WithTags("UserAchievements");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteUserAchievement")
            .WithSummary("Delete a userAchievement")
            .WithTags("UserAchievements");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<UserAchievementDto>>> List(
        UserAchievementService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<UserAchievementDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<UserAchievementDto>, NotFound>> GetById(
        Guid id, UserAchievementService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<UserAchievementDto>> Create(
        CreateUserAchievementRequest request, UserAchievementService service, CancellationToken cancellationToken)
    {
        var userAchievement = await service.CreateAsync(
            request.UserId,
            request.AchievementId,
            request.UnlockedAt,
            cancellationToken);

        var location = $"/api/user-achievements/{ userAchievement.Id}";
        return TypedResults.Created(location, ToDto(userAchievement));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, UserAchievementService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static UserAchievementDto ToDto(UserAchievement e) => new(
        e.Id,
        e.UserId,
        e.AchievementId,
        e.UnlockedAt
    );
}
