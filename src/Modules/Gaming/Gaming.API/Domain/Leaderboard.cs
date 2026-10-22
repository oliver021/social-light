namespace SocialLight.Gaming.Domain;

/// <summary>
/// <c>Leaderboard</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Leaderboard
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid GameId { get; private set; }
    public Guid? SeasonId { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Leaderboard() { }

    public Leaderboard(
        Guid gameId,
        Guid? seasonId
    )
    {
        GameId = gameId;
        SeasonId = seasonId;
    }
}
