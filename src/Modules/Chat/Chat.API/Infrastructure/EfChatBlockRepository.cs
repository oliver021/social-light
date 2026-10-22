using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IChatBlockRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfChatBlockRepository(
    ChatDbContext context,
    ILogger<EfChatBlockRepository> logger) : IChatBlockRepository
{
    public async Task<ChatBlock> AddAsync(ChatBlock chatBlock, CancellationToken cancellationToken = default)
    {
        context.ChatBlocks.Add(chatBlock);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(ChatBlock), chatBlock.Id);
        return chatBlock;
    }

    public Task<ChatBlock?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.ChatBlocks.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ChatBlock>> ListAsync(CancellationToken cancellationToken = default)
        => await context.ChatBlocks.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var chatBlock = await context.ChatBlocks.FindAsync([id], cancellationToken);
        if (chatBlock is null)
        {
            return false;
        }

        context.ChatBlocks.Remove(chatBlock);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(ChatBlock), id);
        return true;
    }
}
