using Microsoft.Extensions.Logging;

namespace SocialLight.Posts.API.Application;

/// <summary>
/// Application service for <c>PostMedia</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class PostMediaService(
    IPostMediaRepository repository,
    ILogger<PostMediaService> logger)
{
    public Task<PostMedia?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<PostMedia>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<PostMedia> CreateAsync(
        Guid postId,
        string fileUrl,
        string mediaType,
        int position,
        CancellationToken cancellationToken = default)
    {
        var postMedia = new PostMedia(
            postId,
            fileUrl,
            mediaType,
            position
        );

        await repository.AddAsync(postMedia, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(PostMedia), postMedia.Id);
        return postMedia;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
