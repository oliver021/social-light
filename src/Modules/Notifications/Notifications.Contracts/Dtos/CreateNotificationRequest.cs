namespace SocialLight.Notifications.Contracts;

/// <summary>
/// Write DTO for creating a <c>Notification</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateNotificationRequest(
    Guid RecipientId,
    Guid ActorId,
    string Type,
    string EntityType,
    Guid EntityId,
    bool IsRead
);
