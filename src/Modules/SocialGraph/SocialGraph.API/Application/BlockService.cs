using Microsoft.Extensions.Logging;

namespace SocialLight.SocialGraph.API.Application;

/// <summary>
/// Application service for <c>Block</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class BlockService(
    IBlockRepository repository,
    ILogger<BlockService> logger)
{
    public Task<Block?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Block>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Block> CreateAsync(
        Guid blockerId,
        Guid blockedId,
        string? reason,
        CancellationToken cancellationToken = default)
    {
        var block = new Block(
            blockerId,
            blockedId,
            reason
        );

        await repository.AddAsync(block, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Block), block.Id);
        return block;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
