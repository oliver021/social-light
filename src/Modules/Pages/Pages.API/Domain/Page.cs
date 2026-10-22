namespace SocialLight.Pages.Domain;

/// <summary>
/// <c>Page</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Page
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = default!;
    public string Category { get; private set; } = default!;
    public string? Description { get; private set; }
    public string? Avatar { get; private set; }
    public string? CoverImage { get; private set; }
    public string VerificationStatus { get; private set; } = default!;
    public ICollection<PageRole> PageRoles { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Page() { }

    public Page(
        string name,
        string category,
        string? description,
        string? avatar,
        string? coverImage,
        string verificationStatus
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(category);
        ArgumentException.ThrowIfNullOrWhiteSpace(verificationStatus);
        Name = name;
        Category = category;
        Description = description;
        Avatar = avatar;
        CoverImage = coverImage;
        VerificationStatus = verificationStatus;
    }
}
