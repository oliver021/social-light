namespace SocialLight.Moderation.Domain;

/// <summary>
/// <c>ModerationAction</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class ModerationAction
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ModerationCaseId { get; private set; }
    public Guid ModeratorId { get; private set; }
    public string ActionType { get; private set; } = default!;
    public DateTime CreatedAt { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected ModerationAction() { }

    public ModerationAction(
        Guid moderationCaseId,
        Guid moderatorId,
        string actionType,
        DateTime createdAt
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(actionType);
        ModerationCaseId = moderationCaseId;
        ModeratorId = moderatorId;
        ActionType = actionType;
        CreatedAt = createdAt;
    }
}
