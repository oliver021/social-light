namespace SocialLight.Events.Contracts;

/// <summary>
/// Read DTO for <c>EventAttendance</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record EventAttendanceDto(
    Guid Id,
    Guid EventId,
    Guid UserId,
    string Status
);
