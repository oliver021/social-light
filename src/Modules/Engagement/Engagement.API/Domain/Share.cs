namespace SocialLight.Engagement.Domain;

/// <summary>
/// <c>Share</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Share
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid SharerId { get; private set; }
    public string TargetType { get; private set; } = default!;
    public Guid TargetId { get; private set; }
    public string? Commentary { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Share() { }

    public Share(
        Guid sharerId,
        string targetType,
        Guid targetId,
        string? commentary
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(targetType);
        SharerId = sharerId;
        TargetType = targetType;
        TargetId = targetId;
        Commentary = commentary;
    }
}
