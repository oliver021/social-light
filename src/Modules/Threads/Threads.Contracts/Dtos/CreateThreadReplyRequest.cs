namespace SocialLight.Threads.Contracts;

/// <summary>
/// Write DTO for creating a <c>ThreadReply</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateThreadReplyRequest(
    Guid ThreadId,
    Guid AuthorId,
    Guid? ParentReplyId,
    string Body
);
