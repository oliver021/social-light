namespace SocialLight.Posts.Domain;

/// <summary>
/// <c>PostMedia</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class PostMedia
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PostId { get; private set; }
    public string FileUrl { get; private set; } = default!;
    public string MediaType { get; private set; } = default!;
    public int Position { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected PostMedia() { }

    public PostMedia(
        Guid postId,
        string fileUrl,
        string mediaType,
        int position
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fileUrl);
        ArgumentException.ThrowIfNullOrWhiteSpace(mediaType);
        PostId = postId;
        FileUrl = fileUrl;
        MediaType = mediaType;
        Position = position;
    }
}
