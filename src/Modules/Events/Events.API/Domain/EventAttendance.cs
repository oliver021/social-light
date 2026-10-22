namespace SocialLight.Events.Domain;

/// <summary>
/// <c>EventAttendance</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class EventAttendance
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid EventId { get; private set; }
    public Guid UserId { get; private set; }
    public string Status { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected EventAttendance() { }

    public EventAttendance(
        Guid eventId,
        Guid userId,
        string status
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(status);
        EventId = eventId;
        UserId = userId;
        Status = status;
    }
}
