namespace SocialLight.Posts.Domain;

/// <summary>
/// <c>Comment</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Comment
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PostId { get; private set; }
    public string Text { get; private set; } = default!;
    public Guid AuthorId { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Comment() { }

    public Comment(
        Guid postId,
        string text,
        Guid authorId
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(text);
        PostId = postId;
        Text = text;
        AuthorId = authorId;
    }
}
