namespace SocialLight.Reels.Contracts;

/// <summary>
/// Write DTO for creating a <c>ReelView</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateReelViewRequest(
    Guid ReelId,
    Guid ViewerId,
    DateTime ViewedAt
);
