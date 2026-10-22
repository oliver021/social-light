namespace SocialLight.Gaming.Contracts;

/// <summary>
/// Read DTO for <c>Team</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record TeamDto(
    Guid Id,
    Guid GameId,
    string Name,
    Guid OwnerId
);
