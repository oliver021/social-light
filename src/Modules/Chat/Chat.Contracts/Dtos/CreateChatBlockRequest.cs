namespace SocialLight.Chat.Contracts;

/// <summary>
/// Write DTO for creating a <c>ChatBlock</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateChatBlockRequest(
    Guid ChatId,
    Guid BlockerId,
    Guid BlockedId
);
