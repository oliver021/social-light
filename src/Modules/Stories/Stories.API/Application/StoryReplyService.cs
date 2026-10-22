using Microsoft.Extensions.Logging;

namespace SocialLight.Stories.API.Application;

/// <summary>
/// Application service for <c>StoryReply</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class StoryReplyService(
    IStoryReplyRepository repository,
    ILogger<StoryReplyService> logger)
{
    public Task<StoryReply?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<StoryReply>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<StoryReply> CreateAsync(
        Guid storyId,
        Guid userId,
        string body,
        CancellationToken cancellationToken = default)
    {
        var storyReply = new StoryReply(
            storyId,
            userId,
            body
        );

        await repository.AddAsync(storyReply, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(StoryReply), storyReply.Id);
        return storyReply;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
