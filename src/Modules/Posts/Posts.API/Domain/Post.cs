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
    public Guid AuthorId { get; private set; }
    public string ContentType { get; private set; } = default!;
    public string Visibility { get; private set; } = default!;
    public string Status { get; private set; } = default!;
    public string? Body { get; private set; }
    public string? Location { get; private set; }
    public DateTime? ScheduledAt { get; private set; }
    public DateTime? PublishedAt { get; private set; }
    public DateTime? ArchivedAt { get; private set; }
    public ICollection<PostMedia> PostMedias { get; private set; } = [];
    public ICollection<PostFeed> PostFeeds { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Post() { }

    public Post(
        Guid authorId,
        string contentType,
        string visibility,
        string status,
        string? body,
        string? location,
        DateTime? scheduledAt,
        DateTime? publishedAt,
        DateTime? archivedAt
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(contentType);
        ArgumentException.ThrowIfNullOrWhiteSpace(visibility);
        ArgumentException.ThrowIfNullOrWhiteSpace(status);
        AuthorId = authorId;
        ContentType = contentType;
        Visibility = visibility;
        Status = status;
        Body = body;
        Location = location;
        ScheduledAt = scheduledAt;
        PublishedAt = publishedAt;
        ArchivedAt = archivedAt;
    }
}
