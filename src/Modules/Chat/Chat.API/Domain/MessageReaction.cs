namespace SocialLight.Chat.Domain;

/// <summary>
/// <c>MessageReaction</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class MessageReaction
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid MessageId { get; private set; }
    public Guid UserId { get; private set; }
    public string ReactionType { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected MessageReaction() { }

    public MessageReaction(
        Guid messageId,
        Guid userId,
        string reactionType
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(reactionType);
        MessageId = messageId;
        UserId = userId;
        ReactionType = reactionType;
    }
}
