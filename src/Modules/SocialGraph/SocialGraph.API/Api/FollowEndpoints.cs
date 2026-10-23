namespace SocialLight.SocialGraph.API.Api;

/// <summary>
/// HTTP endpoints for <c>Follow</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class FollowEndpoints
{
    public static IEndpointRouteBuilder MapFollowEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Follows")
            .MapGroup("/api/follows")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListFollows")
            .WithSummary("List follows")
            .WithTags("Follows");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetFollow")
            .WithSummary("Get a follow by id")
            .WithTags("Follows");

        api.MapPost("/", Create)
            .WithName("CreateFollow")
            .WithSummary("Create a follow")
            .WithTags("Follows");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteFollow")
            .WithSummary("Delete a follow")
            .WithTags("Follows");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<FollowDto>>> List(
        FollowService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<FollowDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<FollowDto>, NotFound>> GetById(
        Guid id, FollowService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<FollowDto>> Create(
        CreateFollowRequest request, FollowService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var followerId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var follow = await service.CreateAsync(
            followerId,
            request.FollowingId,
            request.Status,
            request.CreatedAt,
            cancellationToken);

        var location = $"/api/follows/{ follow.Id}";
        return TypedResults.Created(location, ToDto(follow));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, FollowService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static FollowDto ToDto(Follow e) => new(
        e.Id,
        e.FollowerId,
        e.FollowingId,
        e.Status,
        e.CreatedAt
    );
}
