namespace SocialLight.SocialGraph.Contracts;

/// <summary>
/// Read DTO for <c>Follow</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record FollowDto(
    Guid Id,
    Guid FollowerId,
    Guid FollowingId,
    string Status,
    DateTime CreatedAt
);
