namespace SocialLight.Notifications.Contracts;

/// <summary>
/// Read DTO for <c>Notification</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record NotificationDto(
    Guid Id,
    Guid RecipientId,
    Guid ActorId,
    string Type,
    string EntityType,
    Guid EntityId,
    bool IsRead
);
