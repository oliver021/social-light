namespace SocialLight.Gaming.Domain;

/// <summary>
/// <c>UserAchievement</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class UserAchievement
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public Guid AchievementId { get; private set; }
    public DateTime UnlockedAt { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected UserAchievement() { }

    public UserAchievement(
        Guid userId,
        Guid achievementId,
        DateTime unlockedAt
    )
    {
        UserId = userId;
        AchievementId = achievementId;
        UnlockedAt = unlockedAt;
    }
}
