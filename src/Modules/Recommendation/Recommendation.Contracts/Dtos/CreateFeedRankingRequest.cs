namespace SocialLight.Recommendation.Contracts;

/// <summary>
/// Write DTO for creating a <c>FeedRanking</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateFeedRankingRequest(
    Guid UserId,
    string TargetType,
    Guid TargetId,
    int Rank
);
