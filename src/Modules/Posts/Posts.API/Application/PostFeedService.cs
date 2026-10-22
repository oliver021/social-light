using Microsoft.Extensions.Logging;

namespace SocialLight.Posts.API.Application;

/// <summary>
/// Application service for <c>PostFeed</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class PostFeedService(
    IPostFeedRepository repository,
    ILogger<PostFeedService> logger)
{
    public Task<PostFeed?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<PostFeed>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<PostFeed> CreateAsync(
        Guid postId,
        string feedType,
        Guid targetId,
        CancellationToken cancellationToken = default)
    {
        var postFeed = new PostFeed(
            postId,
            feedType,
            targetId
        );

        await repository.AddAsync(postFeed, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(PostFeed), postFeed.Id);
        return postFeed;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
