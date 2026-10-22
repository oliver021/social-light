namespace SocialLight.Stories.Contracts;

/// <summary>
/// Read DTO for <c>Story</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record StoryDto(
    Guid Id,
    Guid AuthorId,
    string MediaType,
    string MediaUrl,
    string? Caption,
    string Visibility,
    DateTime ExpiresAt
);
