namespace SocialLight.SocialGraph.Domain;

/// <summary>
/// <c>Friend</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Friend
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid RequesterId { get; private set; }
    public Guid RecipientId { get; private set; }
    public string Status { get; private set; } = default!;
    public DateTime? AcceptedAt { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Friend() { }

    public Friend(
        Guid requesterId,
        Guid recipientId,
        string status,
        DateTime? acceptedAt
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(status);
        RequesterId = requesterId;
        RecipientId = recipientId;
        Status = status;
        AcceptedAt = acceptedAt;
    }
}
