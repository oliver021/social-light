namespace SocialLight.Recommendation.Contracts;

/// <summary>
/// Write DTO for creating a <c>Topic</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateTopicRequest(
    string Name
);
