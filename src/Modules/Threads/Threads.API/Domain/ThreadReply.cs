namespace SocialLight.Threads.Domain;

/// <summary>
/// <c>ThreadReply</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class ThreadReply
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ThreadId { get; private set; }
    public Guid AuthorId { get; private set; }
    public Guid? ParentReplyId { get; private set; }
    public string Body { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected ThreadReply() { }

    public ThreadReply(
        Guid threadId,
        Guid authorId,
        Guid? parentReplyId,
        string body
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(body);
        ThreadId = threadId;
        AuthorId = authorId;
        ParentReplyId = parentReplyId;
        Body = body;
    }
}
