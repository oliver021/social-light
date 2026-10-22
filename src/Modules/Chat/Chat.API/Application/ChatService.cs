using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Application;

/// <summary>
/// Application service for <c>Chat</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port, publishing the module's integration events on state change.
/// </summary>
public class ChatService(
    IChatRepository repository,
    IEventBus eventBus,
    ILogger<ChatService> logger)
{
    public Task<global::SocialLight.Chat.Domain.Chat?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<global::SocialLight.Chat.Domain.Chat>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<global::SocialLight.Chat.Domain.Chat> CreateAsync(
        string type,
        string? title,
        Guid createdBy,
        CancellationToken cancellationToken = default)
    {
        var chat = new global::SocialLight.Chat.Domain.Chat(
            type,
            title,
            createdBy
        );

        await repository.AddAsync(chat, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(global::SocialLight.Chat.Domain.Chat), chat.Id);
        await eventBus.PublishAsync(new ChatCreated());
        return chat;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
