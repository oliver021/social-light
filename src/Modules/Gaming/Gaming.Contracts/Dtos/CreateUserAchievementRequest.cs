namespace SocialLight.Gaming.Contracts;

/// <summary>
/// Write DTO for creating a <c>UserAchievement</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateUserAchievementRequest(
    Guid UserId,
    Guid AchievementId,
    DateTime UnlockedAt
);
