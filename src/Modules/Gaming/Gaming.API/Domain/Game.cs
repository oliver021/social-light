namespace SocialLight.Gaming.Domain;

/// <summary>
/// <c>Game</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Game
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = default!;
    public string Type { get; private set; } = default!;
    public string? Provider { get; private set; }
    public string? Source { get; private set; }
    public string? Platform { get; private set; }
    public ICollection<Achievement> Achievements { get; private set; } = [];
    public ICollection<Tournament> Tournaments { get; private set; } = [];
    public ICollection<Team> Teams { get; private set; } = [];
    public ICollection<Match> Matchs { get; private set; } = [];
    public ICollection<Leaderboard> Leaderboards { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Game() { }

    public Game(
        string name,
        string type,
        string? provider,
        string? source,
        string? platform
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(type);
        Name = name;
        Type = type;
        Provider = provider;
        Source = source;
        Platform = platform;
    }
}
