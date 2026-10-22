namespace SocialLight.Gaming.API.Api;

/// <summary>
/// HTTP endpoints for <c>Team</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class TeamEndpoints
{
    public static IEndpointRouteBuilder MapTeamEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Teams")
            .MapGroup("/api/teams")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListTeams")
            .WithSummary("List teams")
            .WithTags("Teams");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetTeam")
            .WithSummary("Get a team by id")
            .WithTags("Teams");

        api.MapPost("/", Create)
            .WithName("CreateTeam")
            .WithSummary("Create a team")
            .WithTags("Teams");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteTeam")
            .WithSummary("Delete a team")
            .WithTags("Teams");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<TeamDto>>> List(
        TeamService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<TeamDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<TeamDto>, NotFound>> GetById(
        Guid id, TeamService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<TeamDto>> Create(
        CreateTeamRequest request, TeamService service, CancellationToken cancellationToken)
    {
        var team = await service.CreateAsync(
            request.GameId,
            request.Name,
            request.OwnerId,
            cancellationToken);

        var location = $"/api/teams/{ team.Id}";
        return TypedResults.Created(location, ToDto(team));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, TeamService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static TeamDto ToDto(Team e) => new(
        e.Id,
        e.GameId,
        e.Name,
        e.OwnerId
    );
}
