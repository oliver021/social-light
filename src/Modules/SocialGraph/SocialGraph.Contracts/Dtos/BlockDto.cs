namespace SocialLight.SocialGraph.Contracts;

/// <summary>
/// Read DTO for <c>Block</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record BlockDto(
    Guid Id,
    Guid BlockerId,
    Guid BlockedId,
    string? Reason
);
