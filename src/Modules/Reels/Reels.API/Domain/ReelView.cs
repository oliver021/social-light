namespace SocialLight.Reels.Domain;

/// <summary>
/// <c>ReelView</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class ReelView
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ReelId { get; private set; }
    public Guid ViewerId { get; private set; }
    public DateTime ViewedAt { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected ReelView() { }

    public ReelView(
        Guid reelId,
        Guid viewerId,
        DateTime viewedAt
    )
    {
        ReelId = reelId;
        ViewerId = viewerId;
        ViewedAt = viewedAt;
    }
}
