namespace SocialLight.Notifications.Domain;

/// <summary>
/// <c>Notification</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Notification
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid RecipientId { get; private set; }
    public Guid ActorId { get; private set; }
    public string Type { get; private set; } = default!;
    public string EntityType { get; private set; } = default!;
    public Guid EntityId { get; private set; }
    public bool IsRead { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Notification() { }

    public Notification(
        Guid recipientId,
        Guid actorId,
        string type,
        string entityType,
        Guid entityId,
        bool isRead
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(type);
        ArgumentException.ThrowIfNullOrWhiteSpace(entityType);
        RecipientId = recipientId;
        ActorId = actorId;
        Type = type;
        EntityType = entityType;
        EntityId = entityId;
        IsRead = isRead;
    }
}
