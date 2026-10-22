namespace SocialLight.Posts.Domain;

/// <summary>
/// <c>PostFeed</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class PostFeed
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PostId { get; private set; }
    public string FeedType { get; private set; } = default!;
    public Guid TargetId { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected PostFeed() { }

    public PostFeed(
        Guid postId,
        string feedType,
        Guid targetId
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(feedType);
        PostId = postId;
        FeedType = feedType;
        TargetId = targetId;
    }
}
