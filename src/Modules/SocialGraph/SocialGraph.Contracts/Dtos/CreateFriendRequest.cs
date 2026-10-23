namespace SocialLight.SocialGraph.Contracts;

/// <summary>
/// Write DTO for creating a <c>Friend</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (RequesterId) — bound server-side from the authenticated principal.
/// </summary>
public record CreateFriendRequest(
    Guid RecipientId,
    string Status,
    DateTime? AcceptedAt
);
