using Microsoft.Extensions.Logging;

namespace SocialLight.Stories.API.Application;

/// <summary>
/// Application service for <c>StoryView</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class StoryViewService(
    IStoryViewRepository repository,
    ILogger<StoryViewService> logger)
{
    public Task<StoryView?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<StoryView>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<StoryView> CreateAsync(
        Guid storyId,
        Guid viewerId,
        DateTime viewedAt,
        CancellationToken cancellationToken = default)
    {
        var storyView = new StoryView(
            storyId,
            viewerId,
            viewedAt
        );

        await repository.AddAsync(storyView, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(StoryView), storyView.Id);
        return storyView;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
