using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Application;

/// <summary>
/// Application service for <c>ChatParticipant</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ChatParticipantService(
    IChatParticipantRepository repository,
    ILogger<ChatParticipantService> logger)
{
    public Task<ChatParticipant?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<ChatParticipant>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<ChatParticipant> CreateAsync(
        Guid chatId,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var chatParticipant = new ChatParticipant(
            chatId,
            userId,
            role
        );

        await repository.AddAsync(chatParticipant, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(ChatParticipant), chatParticipant.Id);
        return chatParticipant;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
