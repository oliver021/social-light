namespace SocialLight.SocialGraph.Contracts;

/// <summary>
/// Write DTO for creating a <c>Follow</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (FollowerId) — bound server-side from the authenticated principal.
/// </summary>
public record CreateFollowRequest(
    Guid FollowingId,
    string Status,
    DateTime CreatedAt
);
