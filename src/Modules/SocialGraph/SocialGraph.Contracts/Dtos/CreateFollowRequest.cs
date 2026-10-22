namespace SocialLight.SocialGraph.Contracts;

/// <summary>
/// Write DTO for creating a <c>Follow</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateFollowRequest(
    Guid FollowerId,
    Guid FollowingId,
    string Status,
    DateTime CreatedAt
);
