namespace SocialLight.Posts.Contracts;

/// <summary>
/// Write DTO for creating a <c>PostFeed</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreatePostFeedRequest(
    Guid PostId,
    string FeedType,
    Guid TargetId
);
