namespace SocialLight.Recommendation.Contracts;

/// <summary>
/// Write DTO for creating a <c>UserInterest</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateUserInterestRequest(
    Guid UserId,
    Guid TopicId,
    double Weight
);
