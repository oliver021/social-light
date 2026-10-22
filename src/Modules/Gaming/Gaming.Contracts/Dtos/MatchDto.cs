namespace SocialLight.Gaming.Contracts;

/// <summary>
/// Read DTO for <c>Match</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record MatchDto(
    Guid Id,
    Guid GameId,
    Guid? TournamentId,
    string Status
);
