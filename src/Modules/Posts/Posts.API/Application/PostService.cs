using Microsoft.Extensions.Logging;

namespace SocialLight.Posts.API.Application;

/// <summary>
/// Application service for <c>Post</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class PostService(
    IPostRepository repository,
    ILogger<PostService> logger)
{
    public Task<Post?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Post>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Post> CreateAsync(
        Guid authorId,
        string contentType,
        string visibility,
        string status,
        string? body,
        string? location,
        DateTime? scheduledAt,
        DateTime? publishedAt,
        DateTime? archivedAt,
        CancellationToken cancellationToken = default)
    {
        var post = new Post(
            authorId,
            contentType,
            visibility,
            status,
            body,
            location,
            scheduledAt,
            publishedAt,
            archivedAt
        );

        await repository.AddAsync(post, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Post), post.Id);
        return post;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
