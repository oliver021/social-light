namespace SocialLight.Moderation.Contracts;

/// <summary>
/// Write DTO for creating a <c>Report</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateReportRequest(
    Guid ReporterId,
    string TargetType,
    Guid TargetId,
    string Category,
    string Status
);
