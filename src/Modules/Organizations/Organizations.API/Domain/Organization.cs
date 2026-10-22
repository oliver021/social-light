namespace SocialLight.Organizations.Domain;

/// <summary>
/// <c>Organization</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Organization
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid OwnerId { get; private set; }
    public string Name { get; private set; } = default!;
    public string? Description { get; private set; }
    public string? Logo { get; private set; }
    public string VerificationStatus { get; private set; } = default!;
    public ICollection<OrganizationMember> OrganizationMembers { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Organization() { }

    public Organization(
        Guid ownerId,
        string name,
        string? description,
        string? logo,
        string verificationStatus
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(verificationStatus);
        OwnerId = ownerId;
        Name = name;
        Description = description;
        Logo = logo;
        VerificationStatus = verificationStatus;
    }
}
