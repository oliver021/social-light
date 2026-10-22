namespace SocialLight.Posts.Contracts;

/// <summary>
/// Write DTO for creating a <c>Post</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (AuthorId) — bound server-side from the authenticated principal.
/// </summary>
public record CreatePostRequest(
    string ContentType,
    string Visibility,
    string Status,
    string? Body,
    string? Location,
    DateTime? ScheduledAt,
    DateTime? PublishedAt,
    DateTime? ArchivedAt
);
