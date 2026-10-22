namespace SocialLight.Stories.Contracts;

/// <summary>
/// Write DTO for creating a <c>Story</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateStoryRequest(
    Guid AuthorId,
    string MediaType,
    string MediaUrl,
    string? Caption,
    string Visibility,
    DateTime ExpiresAt
);
