namespace SocialLight.Recommendation.Domain;

/// <summary>
/// <c>TrendingTopic</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class TrendingTopic
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid TopicId { get; private set; }
    public string? Region { get; private set; }
    public double Score { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected TrendingTopic() { }

    public TrendingTopic(
        Guid topicId,
        string? region,
        double score
    )
    {
        TopicId = topicId;
        Region = region;
        Score = score;
    }
}
