namespace SocialLight.Gaming.Domain;

/// <summary>
/// <c>Achievement</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Achievement
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid GameId { get; private set; }
    public string Title { get; private set; } = default!;
    public string? Description { get; private set; }
    public ICollection<UserAchievement> UserAchievements { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Achievement() { }

    public Achievement(
        Guid gameId,
        string title,
        string? description
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        GameId = gameId;
        Title = title;
        Description = description;
    }
}
