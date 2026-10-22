namespace SocialLight.Recommendation.Domain;

/// <summary>
/// <c>Topic</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Topic
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Topic() { }

    public Topic(
        string name
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        Name = name;
    }
}
