using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Application;

/// <summary>
/// Application service for <c>MessageReadReceipt</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class MessageReadReceiptService(
    IMessageReadReceiptRepository repository,
    ILogger<MessageReadReceiptService> logger)
{
    public Task<MessageReadReceipt?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<MessageReadReceipt>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<MessageReadReceipt> CreateAsync(
        Guid messageId,
        Guid userId,
        DateTime readAt,
        CancellationToken cancellationToken = default)
    {
        var messageReadReceipt = new MessageReadReceipt(
            messageId,
            userId,
            readAt
        );

        await repository.AddAsync(messageReadReceipt, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(MessageReadReceipt), messageReadReceipt.Id);
        return messageReadReceipt;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
