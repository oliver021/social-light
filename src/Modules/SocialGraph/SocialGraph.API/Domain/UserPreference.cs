namespace SocialLight.SocialGraph.Domain;

/// <summary>
/// <c>UserPreference</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class UserPreference
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public string EntityType { get; private set; } = default!;
    public Guid EntityId { get; private set; }
    public string PreferenceType { get; private set; } = default!;
    public DateTime? ExpiresAt { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected UserPreference() { }

    public UserPreference(
        Guid userId,
        string entityType,
        Guid entityId,
        string preferenceType,
        DateTime? expiresAt
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(entityType);
        ArgumentException.ThrowIfNullOrWhiteSpace(preferenceType);
        UserId = userId;
        EntityType = entityType;
        EntityId = entityId;
        PreferenceType = preferenceType;
        ExpiresAt = expiresAt;
    }
}
