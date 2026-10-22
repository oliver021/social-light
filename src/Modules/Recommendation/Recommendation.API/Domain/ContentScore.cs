namespace SocialLight.Recommendation.Domain;

/// <summary>
/// <c>ContentScore</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class ContentScore
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string TargetType { get; private set; } = default!;
    public Guid TargetId { get; private set; }
    public double Score { get; private set; }
    public DateTime ComputedAt { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected ContentScore() { }

    public ContentScore(
        string targetType,
        Guid targetId,
        double score,
        DateTime computedAt
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(targetType);
        TargetType = targetType;
        TargetId = targetId;
        Score = score;
        ComputedAt = computedAt;
    }
}
