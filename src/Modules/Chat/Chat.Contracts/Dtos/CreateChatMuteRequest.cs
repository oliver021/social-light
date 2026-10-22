namespace SocialLight.Chat.Contracts;

/// <summary>
/// Write DTO for creating a <c>ChatMute</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateChatMuteRequest(
    Guid ChatId,
    Guid UserId,
    DateTime? MutedUntil
);
