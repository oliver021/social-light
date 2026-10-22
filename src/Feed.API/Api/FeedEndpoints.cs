namespace SocialLight.Feed.API.Api;

/// <summary>
/// Feed endpoints (auth-gated, versioned). The home feed is resolved for the
/// authenticated caller (from the JWT sub); a user feed is any author's timeline.
/// </summary>
public static class FeedEndpoints
{
    public static IEndpointRouteBuilder MapFeedEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Feed")
            .MapGroup("/api/feed")
            .HasApiVersion(1, 0);

        api.RequireAuthorization();

        api.MapGet("/home", GetHome)
            .WithName("GetHomeFeed")
            .WithSummary("The authenticated user's home timeline")
            .WithTags("Feed");

        api.MapGet("/user/{userId:guid}", GetUserFeed)
            .WithName("GetUserFeed")
            .WithSummary("A user's posts timeline")
            .WithTags("Feed");

        return app;
    }

    private static async Task<Ok<IReadOnlyList<FeedItemDto>>> GetHome(
        ClaimsPrincipal user, FeedService feed, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var items = await feed.GetHomeAsync(userId, cancellationToken);
        return TypedResults.Ok(items);
    }

    private static async Task<Ok<IReadOnlyList<FeedItemDto>>> GetUserFeed(
        Guid userId, FeedService feed, CancellationToken cancellationToken)
    {
        var items = await feed.GetUserAsync(userId, cancellationToken);
        return TypedResults.Ok(items);
    }
}
