namespace SocialLight.Reels.Contracts;

/// <summary>
/// Write DTO for creating a <c>ReelView</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (ViewerId) — bound server-side from the authenticated principal.
/// </summary>
public record CreateReelViewRequest(
    Guid ReelId,
    DateTime ViewedAt
);
