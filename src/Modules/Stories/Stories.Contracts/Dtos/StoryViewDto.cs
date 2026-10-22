namespace SocialLight.Stories.Contracts;

/// <summary>
/// Read DTO for <c>StoryView</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record StoryViewDto(
    Guid Id,
    Guid StoryId,
    Guid ViewerId,
    DateTime ViewedAt
);
