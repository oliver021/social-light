namespace SocialLight.Posts.Domain;

/// <summary>
/// <c>Post</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Post
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Title { get; private set; } = default!;
    public string? Body { get; private set; }
    public Guid AuthorId { get; private set; }
    public ICollection<Comment> Comments { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Post() { }

    public Post(
        string title,
        string? body,
        Guid authorId
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        Title = title;
        Body = body;
        AuthorId = authorId;
    }
}
