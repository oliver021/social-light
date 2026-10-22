using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Application;

/// <summary>
/// Application service for <c>ChatBlock</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ChatBlockService(
    IChatBlockRepository repository,
    ILogger<ChatBlockService> logger)
{
    public Task<ChatBlock?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<ChatBlock>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<ChatBlock> CreateAsync(
        Guid chatId,
        Guid blockerId,
        Guid blockedId,
        CancellationToken cancellationToken = default)
    {
        var chatBlock = new ChatBlock(
            chatId,
            blockerId,
            blockedId
        );

        await repository.AddAsync(chatBlock, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(ChatBlock), chatBlock.Id);
        return chatBlock;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
