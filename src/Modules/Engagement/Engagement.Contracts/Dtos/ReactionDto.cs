namespace SocialLight.Engagement.Contracts;

/// <summary>
/// Read DTO for <c>Reaction</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record ReactionDto(
    Guid Id,
    Guid UserId,
    string TargetType,
    Guid TargetId,
    string ReactionType
);
