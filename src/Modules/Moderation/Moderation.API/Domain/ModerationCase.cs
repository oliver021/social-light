namespace SocialLight.Moderation.Domain;

/// <summary>
/// <c>ModerationCase</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class ModerationCase
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string TargetType { get; private set; } = default!;
    public Guid TargetId { get; private set; }
    public string Status { get; private set; } = default!;
    public DateTime OpenedAt { get; private set; }
    public ICollection<ModerationAction> ModerationActions { get; private set; } = [];
    public ICollection<ModerationNote> ModerationNotes { get; private set; } = [];
    public ICollection<Appeal> Appeals { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected ModerationCase() { }

    public ModerationCase(
        string targetType,
        Guid targetId,
        string status,
        DateTime openedAt
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(targetType);
        ArgumentException.ThrowIfNullOrWhiteSpace(status);
        TargetType = targetType;
        TargetId = targetId;
        Status = status;
        OpenedAt = openedAt;
    }
}
