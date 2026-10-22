namespace SocialLight.Organizations.Domain;

/// <summary>
/// <c>OrganizationMember</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class OrganizationMember
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OrganizationId { get; private set; }
    public Guid UserId { get; private set; }
    public string Role { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected OrganizationMember() { }

    public OrganizationMember(
        Guid organizationId,
        Guid userId,
        string role
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(role);
        OrganizationId = organizationId;
        UserId = userId;
        Role = role;
    }
}
