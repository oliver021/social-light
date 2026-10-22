namespace SocialLight.Recommendation.Contracts;

/// <summary>
/// Write DTO for creating a <c>ContentScore</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateContentScoreRequest(
    string TargetType,
    Guid TargetId,
    double Score,
    DateTime ComputedAt
);
