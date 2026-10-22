namespace SocialLight.Chat.Contracts;

/// <summary>
/// Write DTO for creating a <c>ChatPin</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateChatPinRequest(
    Guid ChatId,
    Guid MessageId
);
