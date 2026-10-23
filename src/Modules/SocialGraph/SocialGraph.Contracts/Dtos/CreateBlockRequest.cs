namespace SocialLight.SocialGraph.Contracts;

/// <summary>
/// Write DTO for creating a <c>Block</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (BlockerId) — bound server-side from the authenticated principal.
/// </summary>
public record CreateBlockRequest(
    Guid BlockedId,
    string? Reason
);
