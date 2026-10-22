namespace SocialLight.Chat.Domain;

/// <summary>
/// <c>MessageReadReceipt</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class MessageReadReceipt
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid MessageId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime ReadAt { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected MessageReadReceipt() { }

    public MessageReadReceipt(
        Guid messageId,
        Guid userId,
        DateTime readAt
    )
    {
        MessageId = messageId;
        UserId = userId;
        ReadAt = readAt;
    }
}
