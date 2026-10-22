namespace SocialLight.Engagement.Contracts;

/// <summary>
/// Write DTO for creating a <c>Share</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (SharerId) — bound server-side from the authenticated principal.
/// </summary>
public record CreateShareRequest(
    string TargetType,
    Guid TargetId,
    string? Commentary
);
