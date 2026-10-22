namespace SocialLight.SocialGraph.Domain;

/// <summary>
/// <c>Follow</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Follow
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid FollowerId { get; private set; }
    public Guid FollowingId { get; private set; }
    public string Status { get; private set; } = default!;
    public DateTime CreatedAt { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Follow() { }

    public Follow(
        Guid followerId,
        Guid followingId,
        string status,
        DateTime createdAt
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(status);
        FollowerId = followerId;
        FollowingId = followingId;
        Status = status;
        CreatedAt = createdAt;
    }
}
