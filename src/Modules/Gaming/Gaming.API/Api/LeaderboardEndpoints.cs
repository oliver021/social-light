namespace SocialLight.Gaming.API.Api;

/// <summary>
/// HTTP endpoints for <c>Leaderboard</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class LeaderboardEndpoints
{
    public static IEndpointRouteBuilder MapLeaderboardEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Leaderboards")
            .MapGroup("/api/leaderboards")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListLeaderboards")
            .WithSummary("List leaderboards")
            .WithTags("Leaderboards");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetLeaderboard")
            .WithSummary("Get a leaderboard by id")
            .WithTags("Leaderboards");

        api.MapPost("/", Create)
            .WithName("CreateLeaderboard")
            .WithSummary("Create a leaderboard")
            .WithTags("Leaderboards");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteLeaderboard")
            .WithSummary("Delete a leaderboard")
            .WithTags("Leaderboards");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<LeaderboardDto>>> List(
        LeaderboardService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<LeaderboardDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<LeaderboardDto>, NotFound>> GetById(
        Guid id, LeaderboardService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<LeaderboardDto>> Create(
        CreateLeaderboardRequest request, LeaderboardService service, CancellationToken cancellationToken)
    {
        var leaderboard = await service.CreateAsync(
            request.GameId,
            request.SeasonId,
            cancellationToken);

        var location = $"/api/leaderboards/{ leaderboard.Id}";
        return TypedResults.Created(location, ToDto(leaderboard));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, LeaderboardService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static LeaderboardDto ToDto(Leaderboard e) => new(
        e.Id,
        e.GameId,
        e.SeasonId
    );
}
