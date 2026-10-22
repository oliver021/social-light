using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Application;

/// <summary>
/// Application service for <c>MessageReaction</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class MessageReactionService(
    IMessageReactionRepository repository,
    ILogger<MessageReactionService> logger)
{
    public Task<MessageReaction?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<MessageReaction>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<MessageReaction> CreateAsync(
        Guid messageId,
        Guid userId,
        string reactionType,
        CancellationToken cancellationToken = default)
    {
        var messageReaction = new MessageReaction(
            messageId,
            userId,
            reactionType
        );

        await repository.AddAsync(messageReaction, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(MessageReaction), messageReaction.Id);
        return messageReaction;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
