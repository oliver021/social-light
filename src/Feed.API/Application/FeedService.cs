namespace SocialLight.Feed.API.Application;

/// <summary>
/// Fetches the data a feed needs from the generated modules (via their typed
/// clients) + Profile, then hands it to the pure <see cref="FeedComposer"/>. MVP =
/// fan-out-on-read: list + filter in memory. Fine for the demo corpus; the
/// optimization path (custom query endpoints, then a materialized timeline fed by
/// PostPublished/UserFollowed events) is a swap behind this same method signature.
/// </summary>
public sealed class FeedService(
    SocialGraphClient socialGraph,
    PostsClient posts,
    EngagementClient engagement,
    ProfileClient profiles)
{
    private const int DefaultTake = 50;

    /// <summary>The home timeline: posts by people the user follows (and themselves).</summary>
    public async Task<IReadOnlyList<FeedItemDto>> GetHomeAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var follows = await socialGraph.GetFollowsAsync(cancellationToken);
        var authorIds = follows
            .Where(f => f.FollowerId == userId)
            .Select(f => f.FollowingId)
            .Append(userId)
            .ToHashSet();

        return await BuildAsync(authorIds, cancellationToken);
    }

    /// <summary>A single author's posts (their profile timeline).</summary>
    public async Task<IReadOnlyList<FeedItemDto>> GetUserAsync(Guid authorId, CancellationToken cancellationToken = default)
        => await BuildAsync(new HashSet<Guid> { authorId }, cancellationToken);

    private async Task<IReadOnlyList<FeedItemDto>> BuildAsync(HashSet<Guid> authorIds, CancellationToken cancellationToken)
    {
        var allPosts = await posts.GetPostsAsync(cancellationToken);
        var relevant = allPosts.Where(p => authorIds.Contains(p.AuthorId)).ToList();

        var comments = await engagement.GetCommentsAsync(cancellationToken);
        var reactions = await engagement.GetReactionsAsync(cancellationToken);
        var commentCounts = comments
            .Where(c => string.Equals(c.TargetType, "Post", StringComparison.OrdinalIgnoreCase))
            .GroupBy(c => c.TargetId).ToDictionary(g => g.Key, g => g.Count());
        var reactionCounts = reactions
            .Where(r => string.Equals(r.TargetType, "Post", StringComparison.OrdinalIgnoreCase))
            .GroupBy(r => r.TargetId).ToDictionary(g => g.Key, g => g.Count());

        var authors = new Dictionary<Guid, FeedAuthorDto>();
        foreach (var id in relevant.Select(p => p.AuthorId).Distinct())
        {
            var profile = await profiles.GetAsync(id, cancellationToken);
            if (profile is not null)
            {
                authors[id] = new FeedAuthorDto(profile.UserId, profile.DisplayName, profile.AvatarUrl);
            }
        }

        return FeedComposer.Compose(authorIds, relevant, authors, commentCounts, reactionCounts, DateTime.UtcNow, DefaultTake);
    }
}
