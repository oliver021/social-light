namespace SocialLight.Chat.Domain;

/// <summary>
/// <c>ChatRequest</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class ChatRequest
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid RequesterId { get; private set; }
    public Guid RecipientId { get; private set; }
    public string Status { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected ChatRequest() { }

    public ChatRequest(
        Guid requesterId,
        Guid recipientId,
        string status
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(status);
        RequesterId = requesterId;
        RecipientId = recipientId;
        Status = status;
    }
}
