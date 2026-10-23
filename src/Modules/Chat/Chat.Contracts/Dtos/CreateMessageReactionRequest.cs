namespace SocialLight.Chat.Contracts;

/// <summary>
/// Write DTO for creating a <c>MessageReaction</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (UserId) — bound server-side from the authenticated principal.
/// </summary>
public record CreateMessageReactionRequest(
    Guid MessageId,
    string ReactionType
);
