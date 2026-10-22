namespace SocialLight.Gaming.Domain;

/// <summary>
/// <c>Tournament</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Tournament
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid GameId { get; private set; }
    public Guid OrganizerId { get; private set; }
    public DateTime StartDate { get; private set; }
    public decimal? PrizePool { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Tournament() { }

    public Tournament(
        Guid gameId,
        Guid organizerId,
        DateTime startDate,
        decimal? prizePool
    )
    {
        GameId = gameId;
        OrganizerId = organizerId;
        StartDate = startDate;
        PrizePool = prizePool;
    }
}
