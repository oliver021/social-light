namespace SocialLight.Posts.Contracts;

/// <summary>
/// Write DTO for creating a <c>Comment</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateCommentRequest(
    Guid PostId,
    string Text,
    Guid AuthorId
);
