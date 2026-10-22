namespace SocialLight.Gaming.Domain;

/// <summary>
/// <c>PlayerProfile</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class PlayerProfile
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public string Nickname { get; private set; } = default!;
    public int Ranking { get; private set; }
    public int Level { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected PlayerProfile() { }

    public PlayerProfile(
        Guid userId,
        string nickname,
        int ranking,
        int level
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nickname);
        UserId = userId;
        Nickname = nickname;
        Ranking = ranking;
        Level = level;
    }
}
