namespace SocialLight.Gaming.Domain;

/// <summary>
/// <c>TeamMember</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class TeamMember
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TeamId { get; private set; }
    public Guid UserId { get; private set; }
    public string Role { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected TeamMember() { }

    public TeamMember(
        Guid teamId,
        Guid userId,
        string role
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(role);
        TeamId = teamId;
        UserId = userId;
        Role = role;
    }
}
