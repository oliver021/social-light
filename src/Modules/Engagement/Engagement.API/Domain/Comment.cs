namespace SocialLight.Engagement.Domain;

/// <summary>
/// <c>Comment</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Comment
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid AuthorId { get; private set; }
    public string TargetType { get; private set; } = default!;
    public Guid TargetId { get; private set; }
    public Guid? ParentCommentId { get; private set; }
    public string Body { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Comment() { }

    public Comment(
        Guid authorId,
        string targetType,
        Guid targetId,
        Guid? parentCommentId,
        string body
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(targetType);
        ArgumentException.ThrowIfNullOrWhiteSpace(body);
        AuthorId = authorId;
        TargetType = targetType;
        TargetId = targetId;
        ParentCommentId = parentCommentId;
        Body = body;
    }
}
