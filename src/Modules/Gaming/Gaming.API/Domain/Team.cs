namespace SocialLight.Gaming.Domain;

/// <summary>
/// <c>Team</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Team
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid GameId { get; private set; }
    public string Name { get; private set; } = default!;
    public Guid OwnerId { get; private set; }
    public ICollection<TeamMember> TeamMembers { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Team() { }

    public Team(
        Guid gameId,
        string name,
        Guid ownerId
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        GameId = gameId;
        Name = name;
        OwnerId = ownerId;
    }
}
