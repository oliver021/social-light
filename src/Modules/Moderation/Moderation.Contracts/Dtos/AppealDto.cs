namespace SocialLight.Moderation.Contracts;

/// <summary>
/// Read DTO for <c>Appeal</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record AppealDto(
    Guid Id,
    Guid ModerationCaseId,
    Guid AppellantId,
    string Reason,
    string Status
);
