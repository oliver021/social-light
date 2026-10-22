namespace SocialLight.Stories.Domain;

/// <summary>
/// <c>Story</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Story
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid AuthorId { get; private set; }
    public string MediaType { get; private set; } = default!;
    public string MediaUrl { get; private set; } = default!;
    public string? Caption { get; private set; }
    public string Visibility { get; private set; } = default!;
    public DateTime ExpiresAt { get; private set; }
    public ICollection<StoryView> StoryViews { get; private set; } = [];
    public ICollection<StoryReply> StoryReplys { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Story() { }

    public Story(
        Guid authorId,
        string mediaType,
        string mediaUrl,
        string? caption,
        string visibility,
        DateTime expiresAt
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(mediaType);
        ArgumentException.ThrowIfNullOrWhiteSpace(mediaUrl);
        ArgumentException.ThrowIfNullOrWhiteSpace(visibility);
        AuthorId = authorId;
        MediaType = mediaType;
        MediaUrl = mediaUrl;
        Caption = caption;
        Visibility = visibility;
        ExpiresAt = expiresAt;
    }
}
