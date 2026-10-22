namespace SocialLight.Posts.Contracts;

/// <summary>
/// Read DTO for <c>Post</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record PostDto(
    Guid Id,
    Guid AuthorId,
    string ContentType,
    string Visibility,
    string Status,
    string? Body,
    string? Location,
    DateTime? ScheduledAt,
    DateTime? PublishedAt,
    DateTime? ArchivedAt
);
