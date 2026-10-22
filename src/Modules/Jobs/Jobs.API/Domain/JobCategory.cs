namespace SocialLight.Jobs.Domain;

/// <summary>
/// <c>JobCategory</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class JobCategory
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Name { get; private set; } = default!;
    public ICollection<JobPosition> JobPositions { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected JobCategory() { }

    public JobCategory(
        string name
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        Name = name;
    }
}
