namespace SocialLight.Moderation.Contracts;

/// <summary>
/// Write DTO for creating a <c>Appeal</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateAppealRequest(
    Guid ModerationCaseId,
    Guid AppellantId,
    string Reason,
    string Status
);
