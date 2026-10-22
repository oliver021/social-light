using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Application;

/// <summary>
/// Application service for <c>Topic</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class TopicService(
    ITopicRepository repository,
    ILogger<TopicService> logger)
{
    public Task<Topic?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Topic>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Topic> CreateAsync(
        string name,
        CancellationToken cancellationToken = default)
    {
        var topic = new Topic(
            name
        );

        await repository.AddAsync(topic, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Topic), topic.Id);
        return topic;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
