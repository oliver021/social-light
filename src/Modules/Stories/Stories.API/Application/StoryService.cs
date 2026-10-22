using Microsoft.Extensions.Logging;

namespace SocialLight.Stories.API.Application;

/// <summary>
/// Application service for <c>Story</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port, publishing the module's integration events on state change.
/// </summary>
public class StoryService(
    IStoryRepository repository,
    IEventBus eventBus,
    ILogger<StoryService> logger)
{
    public Task<Story?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Story>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Story> CreateAsync(
        Guid authorId,
        string mediaType,
        string mediaUrl,
        string? caption,
        string visibility,
        DateTime expiresAt,
        CancellationToken cancellationToken = default)
    {
        var story = new Story(
            authorId,
            mediaType,
            mediaUrl,
            caption,
            visibility,
            expiresAt
        );

        await repository.AddAsync(story, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Story), story.Id);
        await eventBus.PublishAsync(new StoryCreated());
        return story;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
