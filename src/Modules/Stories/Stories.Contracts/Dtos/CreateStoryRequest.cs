namespace SocialLight.Stories.Contracts;

/// <summary>
/// Write DTO for creating a <c>Story</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (AuthorId) — bound server-side from the authenticated principal.
/// </summary>
public record CreateStoryRequest(
    string MediaType,
    string MediaUrl,
    string? Caption,
    string Visibility,
    DateTime ExpiresAt
);
