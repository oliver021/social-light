namespace SocialLight.Reels.Contracts;

/// <summary>
/// Read DTO for <c>ReelView</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record ReelViewDto(
    Guid Id,
    Guid ReelId,
    Guid ViewerId,
    DateTime ViewedAt
);
