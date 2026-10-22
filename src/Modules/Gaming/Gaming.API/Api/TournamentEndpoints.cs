namespace SocialLight.Gaming.API.Api;

/// <summary>
/// HTTP endpoints for <c>Tournament</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class TournamentEndpoints
{
    public static IEndpointRouteBuilder MapTournamentEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Tournaments")
            .MapGroup("/api/tournaments")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListTournaments")
            .WithSummary("List tournaments")
            .WithTags("Tournaments");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetTournament")
            .WithSummary("Get a tournament by id")
            .WithTags("Tournaments");

        api.MapPost("/", Create)
            .WithName("CreateTournament")
            .WithSummary("Create a tournament")
            .WithTags("Tournaments");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteTournament")
            .WithSummary("Delete a tournament")
            .WithTags("Tournaments");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<TournamentDto>>> List(
        TournamentService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<TournamentDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<TournamentDto>, NotFound>> GetById(
        Guid id, TournamentService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<TournamentDto>> Create(
        CreateTournamentRequest request, TournamentService service, CancellationToken cancellationToken)
    {
        var tournament = await service.CreateAsync(
            request.GameId,
            request.OrganizerId,
            request.StartDate,
            request.PrizePool,
            cancellationToken);

        var location = $"/api/tournaments/{ tournament.Id}";
        return TypedResults.Created(location, ToDto(tournament));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, TournamentService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static TournamentDto ToDto(Tournament e) => new(
        e.Id,
        e.GameId,
        e.OrganizerId,
        e.StartDate,
        e.PrizePool
    );
}
