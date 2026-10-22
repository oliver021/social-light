namespace SocialLight.Chat.Domain;

/// <summary>
/// <c>Message</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Message
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ChatId { get; private set; }
    public Guid SenderId { get; private set; }
    public string ContentType { get; private set; } = default!;
    public string Content { get; private set; } = default!;
    public DateTime? EditedAt { get; private set; }
    public ICollection<MessageReaction> MessageReactions { get; private set; } = [];
    public ICollection<MessageReadReceipt> MessageReadReceipts { get; private set; } = [];
    public ICollection<MessageAttachment> MessageAttachments { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Message() { }

    public Message(
        Guid chatId,
        Guid senderId,
        string contentType,
        string content,
        DateTime? editedAt
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(contentType);
        ArgumentException.ThrowIfNullOrWhiteSpace(content);
        ChatId = chatId;
        SenderId = senderId;
        ContentType = contentType;
        Content = content;
        EditedAt = editedAt;
    }
}
