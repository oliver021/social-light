namespace SocialLight.SocialGraph.API.Api;

/// <summary>
/// HTTP endpoints for <c>UserPreference</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class UserPreferenceEndpoints
{
    public static IEndpointRouteBuilder MapUserPreferenceEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("UserPreferences")
            .MapGroup("/api/user-preferences")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListUserPreferences")
            .WithSummary("List userPreferences")
            .WithTags("UserPreferences");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetUserPreference")
            .WithSummary("Get a userPreference by id")
            .WithTags("UserPreferences");

        api.MapPost("/", Create)
            .WithName("CreateUserPreference")
            .WithSummary("Create a userPreference")
            .WithTags("UserPreferences");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteUserPreference")
            .WithSummary("Delete a userPreference")
            .WithTags("UserPreferences");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<UserPreferenceDto>>> List(
        UserPreferenceService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<UserPreferenceDto>>([.. items.Where(scope).Select(ToDto)]);
    }

    public static async Task<Results<Ok<UserPreferenceDto>, NotFound>> GetById(
        Guid id, UserPreferenceService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var item = await service.GetAsync(id, cancellationToken);
        // Not visible to the caller == not found (never reveal that it exists).
        return item is null || !scope(item) ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<UserPreferenceDto>> Create(
        CreateUserPreferenceRequest request, UserPreferenceService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var userPreference = await service.CreateAsync(
            userId,
            request.EntityType,
            request.EntityId,
            request.PreferenceType,
            request.ExpiresAt,
            cancellationToken);

        var location = $"/api/user-preferences/{ userPreference.Id}";
        return TypedResults.Created(location, ToDto(userPreference));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, UserPreferenceService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var scope = await ScopeAsync(user, cancellationToken);
        var item = await service.GetAsync(id, cancellationToken);
        if (item is null || !scope(item)) return TypedResults.NotFound();
        return await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();
    }

    /// <summary>
    /// Read scope (spec `readScope`): the caller sees only rows that concern them
    /// — rows where <c>UserId</c> is the caller.
    /// Derived from the JWT `sub`, never from the request.
    /// </summary>
    private static async Task<Func<UserPreference, bool>> ScopeAsync(
        ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var me = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        await Task.CompletedTask;
        return e => e.UserId == me;
    }

    private static UserPreferenceDto ToDto(UserPreference e) => new(
        e.Id,
        e.UserId,
        e.EntityType,
        e.EntityId,
        e.PreferenceType,
        e.ExpiresAt
    );
}
