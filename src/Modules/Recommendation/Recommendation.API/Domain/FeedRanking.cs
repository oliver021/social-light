namespace SocialLight.Recommendation.Domain;

/// <summary>
/// <c>FeedRanking</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class FeedRanking
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public string TargetType { get; private set; } = default!;
    public Guid TargetId { get; private set; }
    public int Rank { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected FeedRanking() { }

    public FeedRanking(
        Guid userId,
        string targetType,
        Guid targetId,
        int rank
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(targetType);
        UserId = userId;
        TargetType = targetType;
        TargetId = targetId;
        Rank = rank;
    }
}
