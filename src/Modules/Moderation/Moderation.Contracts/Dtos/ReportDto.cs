namespace SocialLight.Moderation.Contracts;

/// <summary>
/// Read DTO for <c>Report</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record ReportDto(
    Guid Id,
    Guid ReporterId,
    string TargetType,
    Guid TargetId,
    string Category,
    string Status
);
