namespace SocialLight.Moderation.Contracts;

/// <summary>
/// Write DTO for creating a <c>ModerationAction</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateModerationActionRequest(
    Guid ModerationCaseId,
    Guid ModeratorId,
    string ActionType,
    DateTime CreatedAt
);
