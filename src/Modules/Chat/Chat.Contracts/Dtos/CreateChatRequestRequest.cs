namespace SocialLight.Chat.Contracts;

/// <summary>
/// Write DTO for creating a <c>ChatRequest</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateChatRequestRequest(
    Guid RequesterId,
    Guid RecipientId,
    string Status
);
