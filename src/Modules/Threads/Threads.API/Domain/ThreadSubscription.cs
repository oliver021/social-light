namespace SocialLight.Threads.Domain;

/// <summary>
/// <c>ThreadSubscription</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class ThreadSubscription
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ThreadId { get; private set; }
    public Guid UserId { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected ThreadSubscription() { }

    public ThreadSubscription(
        Guid threadId,
        Guid userId
    )
    {
        ThreadId = threadId;
        UserId = userId;
    }
}
