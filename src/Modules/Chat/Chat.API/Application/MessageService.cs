using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Application;

/// <summary>
/// Application service for <c>Message</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class MessageService(
    IMessageRepository repository,
    ILogger<MessageService> logger)
{
    public Task<Message?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Message>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Message> CreateAsync(
        Guid chatId,
        Guid senderId,
        string contentType,
        string content,
        DateTime? editedAt,
        CancellationToken cancellationToken = default)
    {
        var message = new Message(
            chatId,
            senderId,
            contentType,
            content,
            editedAt
        );

        await repository.AddAsync(message, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Message), message.Id);
        return message;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
