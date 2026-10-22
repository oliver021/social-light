namespace SocialLight.Chat.Contracts;

/// <summary>
/// Write DTO for creating a <c>ChatParticipant</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateChatParticipantRequest(
    Guid ChatId,
    Guid UserId,
    string Role
);
