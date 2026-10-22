namespace SocialLight.Gaming.Contracts;

/// <summary>
/// Read DTO for <c>UserAchievement</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record UserAchievementDto(
    Guid Id,
    Guid UserId,
    Guid AchievementId,
    DateTime UnlockedAt
);
