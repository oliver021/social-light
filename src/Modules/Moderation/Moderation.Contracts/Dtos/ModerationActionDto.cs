namespace SocialLight.Moderation.Contracts;

/// <summary>
/// Read DTO for <c>ModerationAction</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record ModerationActionDto(
    Guid Id,
    Guid ModerationCaseId,
    Guid ModeratorId,
    string ActionType,
    DateTime CreatedAt
);
