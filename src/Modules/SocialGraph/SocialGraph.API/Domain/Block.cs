namespace SocialLight.SocialGraph.Domain;

/// <summary>
/// <c>Block</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Block
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid BlockerId { get; private set; }
    public Guid BlockedId { get; private set; }
    public string? Reason { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Block() { }

    public Block(
        Guid blockerId,
        Guid blockedId,
        string? reason
    )
    {
        BlockerId = blockerId;
        BlockedId = blockedId;
        Reason = reason;
    }
}
