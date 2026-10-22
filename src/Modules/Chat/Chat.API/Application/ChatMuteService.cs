using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Application;

/// <summary>
/// Application service for <c>ChatMute</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ChatMuteService(
    IChatMuteRepository repository,
    ILogger<ChatMuteService> logger)
{
    public Task<ChatMute?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<ChatMute>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<ChatMute> CreateAsync(
        Guid chatId,
        Guid userId,
        DateTime? mutedUntil,
        CancellationToken cancellationToken = default)
    {
        var chatMute = new ChatMute(
            chatId,
            userId,
            mutedUntil
        );

        await repository.AddAsync(chatMute, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(ChatMute), chatMute.Id);
        return chatMute;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
