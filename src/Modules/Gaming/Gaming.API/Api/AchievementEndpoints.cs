namespace SocialLight.Gaming.API.Api;

/// <summary>
/// HTTP endpoints for <c>Achievement</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class AchievementEndpoints
{
    public static IEndpointRouteBuilder MapAchievementEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Achievements")
            .MapGroup("/api/achievements")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListAchievements")
            .WithSummary("List achievements")
            .WithTags("Achievements");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetAchievement")
            .WithSummary("Get a achievement by id")
            .WithTags("Achievements");

        api.MapPost("/", Create)
            .WithName("CreateAchievement")
            .WithSummary("Create a achievement")
            .WithTags("Achievements");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteAchievement")
            .WithSummary("Delete a achievement")
            .WithTags("Achievements");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<AchievementDto>>> List(
        AchievementService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<AchievementDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<AchievementDto>, NotFound>> GetById(
        Guid id, AchievementService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<AchievementDto>> Create(
        CreateAchievementRequest request, AchievementService service, CancellationToken cancellationToken)
    {
        var achievement = await service.CreateAsync(
            request.GameId,
            request.Title,
            request.Description,
            cancellationToken);

        var location = $"/api/achievements/{ achievement.Id}";
        return TypedResults.Created(location, ToDto(achievement));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, AchievementService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static AchievementDto ToDto(Achievement e) => new(
        e.Id,
        e.GameId,
        e.Title,
        e.Description
    );
}
