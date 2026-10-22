namespace SocialLight.Gaming.API.Api;

/// <summary>
/// HTTP endpoints for <c>PlayerProfile</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class PlayerProfileEndpoints
{
    public static IEndpointRouteBuilder MapPlayerProfileEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("PlayerProfiles")
            .MapGroup("/api/player-profiles")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListPlayerProfiles")
            .WithSummary("List playerProfiles")
            .WithTags("PlayerProfiles");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetPlayerProfile")
            .WithSummary("Get a playerProfile by id")
            .WithTags("PlayerProfiles");

        api.MapPost("/", Create)
            .WithName("CreatePlayerProfile")
            .WithSummary("Create a playerProfile")
            .WithTags("PlayerProfiles");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeletePlayerProfile")
            .WithSummary("Delete a playerProfile")
            .WithTags("PlayerProfiles");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<PlayerProfileDto>>> List(
        PlayerProfileService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<PlayerProfileDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<PlayerProfileDto>, NotFound>> GetById(
        Guid id, PlayerProfileService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<PlayerProfileDto>> Create(
        CreatePlayerProfileRequest request, PlayerProfileService service, CancellationToken cancellationToken)
    {
        var playerProfile = await service.CreateAsync(
            request.UserId,
            request.Nickname,
            request.Ranking,
            request.Level,
            cancellationToken);

        var location = $"/api/player-profiles/{ playerProfile.Id}";
        return TypedResults.Created(location, ToDto(playerProfile));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, PlayerProfileService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static PlayerProfileDto ToDto(PlayerProfile e) => new(
        e.Id,
        e.UserId,
        e.Nickname,
        e.Ranking,
        e.Level
    );
}
