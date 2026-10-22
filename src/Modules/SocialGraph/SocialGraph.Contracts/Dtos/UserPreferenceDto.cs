namespace SocialLight.SocialGraph.Contracts;

/// <summary>
/// Read DTO for <c>UserPreference</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record UserPreferenceDto(
    Guid Id,
    Guid UserId,
    string EntityType,
    Guid EntityId,
    string PreferenceType,
    DateTime? ExpiresAt
);
