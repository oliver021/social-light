namespace SocialLight.Stories.Domain;

/// <summary>
/// <c>StoryReply</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class StoryReply
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid StoryId { get; private set; }
    public Guid UserId { get; private set; }
    public string Body { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected StoryReply() { }

    public StoryReply(
        Guid storyId,
        Guid userId,
        string body
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(body);
        StoryId = storyId;
        UserId = userId;
        Body = body;
    }
}
