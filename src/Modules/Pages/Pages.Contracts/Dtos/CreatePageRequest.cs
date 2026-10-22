namespace SocialLight.Pages.Contracts;

/// <summary>
/// Write DTO for creating a <c>Page</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreatePageRequest(
    string Name,
    string Category,
    string? Description,
    string? Avatar,
    string? CoverImage,
    string VerificationStatus
);
