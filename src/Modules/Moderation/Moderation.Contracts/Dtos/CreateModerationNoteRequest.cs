namespace SocialLight.Moderation.Contracts;

/// <summary>
/// Write DTO for creating a <c>ModerationNote</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateModerationNoteRequest(
    Guid ModerationCaseId,
    Guid ModeratorId,
    string Note
);
