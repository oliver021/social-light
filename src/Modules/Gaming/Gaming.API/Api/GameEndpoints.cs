namespace SocialLight.Gaming.API.Api;

/// <summary>
/// HTTP endpoints for <c>Game</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class GameEndpoints
{
    public static IEndpointRouteBuilder MapGameEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Games")
            .MapGroup("/api/games")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListGames")
            .WithSummary("List games")
            .WithTags("Games");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetGame")
            .WithSummary("Get a game by id")
            .WithTags("Games");

        api.MapPost("/", Create)
            .WithName("CreateGame")
            .WithSummary("Create a game")
            .WithTags("Games");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteGame")
            .WithSummary("Delete a game")
            .WithTags("Games");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<GameDto>>> List(
        GameService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<GameDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<GameDto>, NotFound>> GetById(
        Guid id, GameService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<GameDto>> Create(
        CreateGameRequest request, GameService service, CancellationToken cancellationToken)
    {
        var game = await service.CreateAsync(
            request.Name,
            request.Type,
            request.Provider,
            request.Source,
            request.Platform,
            cancellationToken);

        var location = $"/api/games/{ game.Id}";
        return TypedResults.Created(location, ToDto(game));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, GameService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static GameDto ToDto(Game e) => new(
        e.Id,
        e.Name,
        e.Type,
        e.Provider,
        e.Source,
        e.Platform
    );
}
