using Microsoft.Extensions.Logging;

namespace SocialLight.SocialGraph.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IBlockRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfBlockRepository(
    SocialGraphDbContext context,
    ILogger<EfBlockRepository> logger) : IBlockRepository
{
    public async Task<Block> AddAsync(Block block, CancellationToken cancellationToken = default)
    {
        context.Blocks.Add(block);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Block), block.Id);
        return block;
    }

    public Task<Block?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Blocks.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Block>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Blocks.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var block = await context.Blocks.FindAsync([id], cancellationToken);
        if (block is null)
        {
            return false;
        }

        context.Blocks.Remove(block);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Block), id);
        return true;
    }
}
