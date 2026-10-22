namespace SocialLight.Recommendation.Contracts;

/// <summary>
/// Read DTO for <c>RecommendationCandidate</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record RecommendationCandidateDto(
    Guid Id,
    Guid UserId,
    string TargetType,
    Guid TargetId,
    string Source
);
