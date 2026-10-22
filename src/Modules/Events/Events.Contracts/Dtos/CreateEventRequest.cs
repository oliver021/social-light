namespace SocialLight.Events.Contracts;

/// <summary>
/// Write DTO for creating a <c>Event</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateEventRequest(
    Guid OrganizerId,
    string Title,
    string? Description,
    string? Location,
    DateTime StartDate,
    DateTime EndDate,
    int? Capacity,
    string Visibility
);
