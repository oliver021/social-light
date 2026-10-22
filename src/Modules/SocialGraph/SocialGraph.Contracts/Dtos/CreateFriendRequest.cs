namespace SocialLight.SocialGraph.Contracts;

/// <summary>
/// Write DTO for creating a <c>Friend</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateFriendRequest(
    Guid RequesterId,
    Guid RecipientId,
    string Status,
    DateTime? AcceptedAt
);
