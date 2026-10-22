namespace SocialLight.Pages.Domain;

/// <summary>
/// <c>PageRole</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class PageRole
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid PageId { get; private set; }
    public Guid UserId { get; private set; }
    public string Role { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected PageRole() { }

    public PageRole(
        Guid pageId,
        Guid userId,
        string role
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(role);
        PageId = pageId;
        UserId = userId;
        Role = role;
    }
}
