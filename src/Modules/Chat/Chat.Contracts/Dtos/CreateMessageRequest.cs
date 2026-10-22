namespace SocialLight.Chat.Contracts;

/// <summary>
/// Write DTO for creating a <c>Message</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateMessageRequest(
    Guid ChatId,
    Guid SenderId,
    string ContentType,
    string Content,
    DateTime? EditedAt
);
