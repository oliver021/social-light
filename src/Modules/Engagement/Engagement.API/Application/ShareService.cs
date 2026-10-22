using Microsoft.Extensions.Logging;

namespace SocialLight.Engagement.API.Application;

/// <summary>
/// Application service for <c>Share</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ShareService(
    IShareRepository repository,
    ILogger<ShareService> logger)
{
    public Task<Share?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Share>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Share> CreateAsync(
        Guid sharerId,
        string targetType,
        Guid targetId,
        string? commentary,
        CancellationToken cancellationToken = default)
    {
        var share = new Share(
            sharerId,
            targetType,
            targetId,
            commentary
        );

        await repository.AddAsync(share, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Share), share.Id);
        return share;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
