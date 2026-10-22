namespace SocialLight.Reels.Domain;

/// <summary>
/// <c>Reel</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Reel
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid CreatorId { get; private set; }
    public string VideoUrl { get; private set; } = default!;
    public string? Caption { get; private set; }
    public int Duration { get; private set; }
    public string Visibility { get; private set; } = default!;
    public Guid? MusicTrackId { get; private set; }
    public ICollection<ReelView> ReelViews { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Reel() { }

    public Reel(
        Guid creatorId,
        string videoUrl,
        string? caption,
        int duration,
        string visibility,
        Guid? musicTrackId
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(videoUrl);
        ArgumentException.ThrowIfNullOrWhiteSpace(visibility);
        CreatorId = creatorId;
        VideoUrl = videoUrl;
        Caption = caption;
        Duration = duration;
        Visibility = visibility;
        MusicTrackId = musicTrackId;
    }
}
