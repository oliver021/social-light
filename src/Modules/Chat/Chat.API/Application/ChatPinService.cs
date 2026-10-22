using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Application;

/// <summary>
/// Application service for <c>ChatPin</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ChatPinService(
    IChatPinRepository repository,
    ILogger<ChatPinService> logger)
{
    public Task<ChatPin?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<ChatPin>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<ChatPin> CreateAsync(
        Guid chatId,
        Guid messageId,
        CancellationToken cancellationToken = default)
    {
        var chatPin = new ChatPin(
            chatId,
            messageId
        );

        await repository.AddAsync(chatPin, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(ChatPin), chatPin.Id);
        return chatPin;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
