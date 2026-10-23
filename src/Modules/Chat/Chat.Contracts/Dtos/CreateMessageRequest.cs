namespace SocialLight.Chat.Contracts;

/// <summary>
/// Write DTO for creating a <c>Message</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (SenderId) — bound server-side from the authenticated principal.
/// </summary>
public record CreateMessageRequest(
    Guid ChatId,
    string ContentType,
    string Content,
    DateTime? EditedAt
);
