namespace SocialLight.Moderation.Contracts;

/// <summary>
/// Write DTO for creating a <c>ModerationCase</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateModerationCaseRequest(
    string TargetType,
    Guid TargetId,
    string Status,
    DateTime OpenedAt
);
