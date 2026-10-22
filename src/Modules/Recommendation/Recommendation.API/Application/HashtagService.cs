using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Application;

/// <summary>
/// Application service for <c>Hashtag</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class HashtagService(
    IHashtagRepository repository,
    ILogger<HashtagService> logger)
{
    public Task<Hashtag?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Hashtag>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Hashtag> CreateAsync(
        string tag,
        CancellationToken cancellationToken = default)
    {
        var hashtag = new Hashtag(
            tag
        );

        await repository.AddAsync(hashtag, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Hashtag), hashtag.Id);
        return hashtag;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
