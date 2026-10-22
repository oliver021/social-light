namespace SocialLight.SocialGraph.API.Api;

/// <summary>
/// HTTP endpoints for <c>Friend</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class FriendEndpoints
{
    public static IEndpointRouteBuilder MapFriendEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Friends")
            .MapGroup("/api/friends")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListFriends")
            .WithSummary("List friends")
            .WithTags("Friends");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetFriend")
            .WithSummary("Get a friend by id")
            .WithTags("Friends");

        api.MapPost("/", Create)
            .WithName("CreateFriend")
            .WithSummary("Create a friend")
            .WithTags("Friends");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteFriend")
            .WithSummary("Delete a friend")
            .WithTags("Friends");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<FriendDto>>> List(
        FriendService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<FriendDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<FriendDto>, NotFound>> GetById(
        Guid id, FriendService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<FriendDto>> Create(
        CreateFriendRequest request, FriendService service, CancellationToken cancellationToken)
    {
        var friend = await service.CreateAsync(
            request.RequesterId,
            request.RecipientId,
            request.Status,
            request.AcceptedAt,
            cancellationToken);

        var location = $"/api/friends/{ friend.Id}";
        return TypedResults.Created(location, ToDto(friend));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, FriendService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static FriendDto ToDto(Friend e) => new(
        e.Id,
        e.RequesterId,
        e.RecipientId,
        e.Status,
        e.AcceptedAt
    );
}
