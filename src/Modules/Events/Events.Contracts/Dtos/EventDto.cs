namespace SocialLight.Events.Contracts;

/// <summary>
/// Read DTO for <c>Event</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record EventDto(
    Guid Id,
    Guid OrganizerId,
    string Title,
    string? Description,
    string? Location,
    DateTime StartDate,
    DateTime EndDate,
    int? Capacity,
    string Visibility
);
