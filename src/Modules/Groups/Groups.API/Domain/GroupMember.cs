namespace SocialLight.Groups.Domain;

/// <summary>
/// <c>GroupMember</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class GroupMember
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid GroupId { get; private set; }
    public Guid UserId { get; private set; }
    public string Role { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected GroupMember() { }

    public GroupMember(
        Guid groupId,
        Guid userId,
        string role
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(role);
        GroupId = groupId;
        UserId = userId;
        Role = role;
    }
}
