namespace SocialLight.Threads.Domain;

/// <summary>
/// <c>Thread</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Thread
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid AuthorId { get; private set; }
    public string Title { get; private set; } = default!;
    public string Body { get; private set; } = default!;
    public string Visibility { get; private set; } = default!;
    public ICollection<ThreadReply> ThreadReplys { get; private set; } = [];
    public ICollection<ThreadSubscription> ThreadSubscriptions { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Thread() { }

    public Thread(
        Guid authorId,
        string title,
        string body,
        string visibility
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(body);
        ArgumentException.ThrowIfNullOrWhiteSpace(visibility);
        AuthorId = authorId;
        Title = title;
        Body = body;
        Visibility = visibility;
    }
}
