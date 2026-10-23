namespace SocialLight.Chat.Contracts;

/// <summary>
/// Write DTO for creating a <c>ChatRequest</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (RequesterId) — bound server-side from the authenticated principal.
/// </summary>
public record CreateChatRequestRequest(
    Guid RecipientId,
    string Status
);
