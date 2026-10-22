namespace SocialLight.Stories.Contracts;

/// <summary>
/// Write DTO for creating a <c>StoryReply</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateStoryReplyRequest(
    Guid StoryId,
    Guid UserId,
    string Body
);
