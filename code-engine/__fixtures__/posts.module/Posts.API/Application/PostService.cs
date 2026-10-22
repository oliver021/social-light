using Microsoft.Extensions.Logging;

namespace SocialLight.Posts.API.Application;

/// <summary>
/// Application service for <c>Post</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port, publishing the module's integration events on state change.
/// </summary>
public class PostService(
    IPostRepository repository,
    IEventBus eventBus,
    ILogger<PostService> logger)
{
    public Task<Post?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Post>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Post> CreateAsync(
        string title,
        string? body,
        Guid authorId,
        CancellationToken cancellationToken = default)
    {
        var post = new Post(
            title,
            body,
            authorId
        );

        await repository.AddAsync(post, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Post), post.Id);
        await eventBus.PublishAsync(new PostCreated());
        return post;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        if (deleted)
        {
            await eventBus.PublishAsync(new PostDeleted());
        }
        return deleted;
    }
}
