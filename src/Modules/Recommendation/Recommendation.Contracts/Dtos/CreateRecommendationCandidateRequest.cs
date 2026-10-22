namespace SocialLight.Recommendation.Contracts;

/// <summary>
/// Write DTO for creating a <c>RecommendationCandidate</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateRecommendationCandidateRequest(
    Guid UserId,
    string TargetType,
    Guid TargetId,
    string Source
);
