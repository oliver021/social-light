namespace SocialLight.Groups.Domain;

/// <summary>
/// <c>Group</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Group
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = default!;
    public string? Description { get; private set; }
    public string? Avatar { get; private set; }
    public string? CoverImage { get; private set; }
    public string PrivacyType { get; private set; } = default!;
    public bool ApprovalRequired { get; private set; }
    public ICollection<GroupMember> GroupMembers { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Group() { }

    public Group(
        string name,
        string? description,
        string? avatar,
        string? coverImage,
        string privacyType,
        bool approvalRequired
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(privacyType);
        Name = name;
        Description = description;
        Avatar = avatar;
        CoverImage = coverImage;
        PrivacyType = privacyType;
        ApprovalRequired = approvalRequired;
    }
}
