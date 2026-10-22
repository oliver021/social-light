namespace SocialLight.Recommendation.Domain;

/// <summary>
/// <c>UserInterest</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class UserInterest
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid UserId { get; private set; }
    public Guid TopicId { get; private set; }
    public double Weight { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected UserInterest() { }

    public UserInterest(
        Guid userId,
        Guid topicId,
        double weight
    )
    {
        UserId = userId;
        TopicId = topicId;
        Weight = weight;
    }
}
