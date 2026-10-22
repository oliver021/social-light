namespace SocialLight.Events.Domain;

/// <summary>
/// <c>Event</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Event
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizerId { get; private set; }
    public string Title { get; private set; } = default!;
    public string? Description { get; private set; }
    public string? Location { get; private set; }
    public DateTime StartDate { get; private set; }
    public DateTime EndDate { get; private set; }
    public int? Capacity { get; private set; }
    public string Visibility { get; private set; } = default!;
    public ICollection<EventAttendance> EventAttendances { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Event() { }

    public Event(
        Guid organizerId,
        string title,
        string? description,
        string? location,
        DateTime startDate,
        DateTime endDate,
        int? capacity,
        string visibility
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(visibility);
        OrganizerId = organizerId;
        Title = title;
        Description = description;
        Location = location;
        StartDate = startDate;
        EndDate = endDate;
        Capacity = capacity;
        Visibility = visibility;
    }
}
