namespace SocialLight.Threads.Contracts;

/// <summary>
/// Read DTO for <c>ThreadReply</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record ThreadReplyDto(
    Guid Id,
    Guid ThreadId,
    Guid AuthorId,
    Guid? ParentReplyId,
    string Body
);
