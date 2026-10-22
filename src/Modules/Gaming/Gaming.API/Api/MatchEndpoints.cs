namespace SocialLight.Gaming.API.Api;

/// <summary>
/// HTTP endpoints for <c>Match</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class MatchEndpoints
{
    public static IEndpointRouteBuilder MapMatchEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Matches")
            .MapGroup("/api/matches")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListMatches")
            .WithSummary("List matches")
            .WithTags("Matches");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetMatch")
            .WithSummary("Get a match by id")
            .WithTags("Matches");

        api.MapPost("/", Create)
            .WithName("CreateMatch")
            .WithSummary("Create a match")
            .WithTags("Matches");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteMatch")
            .WithSummary("Delete a match")
            .WithTags("Matches");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<MatchDto>>> List(
        MatchService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<MatchDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<MatchDto>, NotFound>> GetById(
        Guid id, MatchService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<MatchDto>> Create(
        CreateMatchRequest request, MatchService service, CancellationToken cancellationToken)
    {
        var match = await service.CreateAsync(
            request.GameId,
            request.TournamentId,
            request.Status,
            cancellationToken);

        var location = $"/api/matches/{ match.Id}";
        return TypedResults.Created(location, ToDto(match));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, MatchService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static MatchDto ToDto(Match e) => new(
        e.Id,
        e.GameId,
        e.TournamentId,
        e.Status
    );
}
