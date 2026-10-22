namespace SocialLight.Engagement.Contracts;

/// <summary>
/// Write DTO for creating a <c>Comment</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (AuthorId) — bound server-side from the authenticated principal.
/// </summary>
public record CreateCommentRequest(
    string TargetType,
    Guid TargetId,
    Guid? ParentCommentId,
    string Body
);
