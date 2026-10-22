namespace SocialLight.Stories.Domain;

/// <summary>
/// <c>StoryView</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class StoryView
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid StoryId { get; private set; }
    public Guid ViewerId { get; private set; }
    public DateTime ViewedAt { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected StoryView() { }

    public StoryView(
        Guid storyId,
        Guid viewerId,
        DateTime viewedAt
    )
    {
        StoryId = storyId;
        ViewerId = viewerId;
        ViewedAt = viewedAt;
    }
}
