namespace SocialLight.Recommendation.Domain;

/// <summary>
/// <c>Hashtag</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Hashtag
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Tag { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Hashtag() { }

    public Hashtag(
        string tag
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tag);
        Tag = tag;
    }
}
