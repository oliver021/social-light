namespace SocialLight.Gaming.Domain;

/// <summary>
/// <c>Match</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Match
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid GameId { get; private set; }
    public Guid? TournamentId { get; private set; }
    public string Status { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Match() { }

    public Match(
        Guid gameId,
        Guid? tournamentId,
        string status
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(status);
        GameId = gameId;
        TournamentId = tournamentId;
        Status = status;
    }
}
