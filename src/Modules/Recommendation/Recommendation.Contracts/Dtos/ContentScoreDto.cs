namespace SocialLight.Recommendation.Contracts;

/// <summary>
/// Read DTO for <c>ContentScore</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record ContentScoreDto(
    Guid Id,
    string TargetType,
    Guid TargetId,
    double Score,
    DateTime ComputedAt
);
