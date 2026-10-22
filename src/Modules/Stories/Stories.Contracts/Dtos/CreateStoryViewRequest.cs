namespace SocialLight.Stories.Contracts;

/// <summary>
/// Write DTO for creating a <c>StoryView</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateStoryViewRequest(
    Guid StoryId,
    Guid ViewerId,
    DateTime ViewedAt
);
