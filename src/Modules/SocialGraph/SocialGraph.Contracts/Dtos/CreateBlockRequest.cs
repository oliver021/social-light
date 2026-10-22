namespace SocialLight.SocialGraph.Contracts;

/// <summary>
/// Write DTO for creating a <c>Block</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateBlockRequest(
    Guid BlockerId,
    Guid BlockedId,
    string? Reason
);
