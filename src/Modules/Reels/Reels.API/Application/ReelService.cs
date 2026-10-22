using Microsoft.Extensions.Logging;

namespace SocialLight.Reels.API.Application;

/// <summary>
/// Application service for <c>Reel</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port, publishing the module's integration events on state change.
/// </summary>
public class ReelService(
    IReelRepository repository,
    IEventBus eventBus,
    ILogger<ReelService> logger)
{
    public Task<Reel?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Reel>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Reel> CreateAsync(
        Guid creatorId,
        string videoUrl,
        string? caption,
        int duration,
        string visibility,
        Guid? musicTrackId,
        CancellationToken cancellationToken = default)
    {
        var reel = new Reel(
            creatorId,
            videoUrl,
            caption,
            duration,
            visibility,
            musicTrackId
        );

        await repository.AddAsync(reel, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Reel), reel.Id);
        await eventBus.PublishAsync(new ReelCreated());
        return reel;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
