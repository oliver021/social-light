namespace SocialLight.Chat.Domain;

/// <summary>
/// <c>MessageAttachment</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class MessageAttachment
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid MessageId { get; private set; }
    public string FileUrl { get; private set; } = default!;
    public string MediaType { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected MessageAttachment() { }

    public MessageAttachment(
        Guid messageId,
        string fileUrl,
        string mediaType
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fileUrl);
        ArgumentException.ThrowIfNullOrWhiteSpace(mediaType);
        MessageId = messageId;
        FileUrl = fileUrl;
        MediaType = mediaType;
    }
}
