namespace SocialLight.Engagement.Domain;

/// <summary>
/// <c>Reaction</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Reaction
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public string TargetType { get; private set; } = default!;
    public Guid TargetId { get; private set; }
    public string ReactionType { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Reaction() { }

    public Reaction(
        Guid userId,
        string targetType,
        Guid targetId,
        string reactionType
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(targetType);
        ArgumentException.ThrowIfNullOrWhiteSpace(reactionType);
        UserId = userId;
        TargetType = targetType;
        TargetId = targetId;
        ReactionType = reactionType;
    }
}
