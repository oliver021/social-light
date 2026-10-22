using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IMessageReactionRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfMessageReactionRepository(
    ChatDbContext context,
    ILogger<EfMessageReactionRepository> logger) : IMessageReactionRepository
{
    public async Task<MessageReaction> AddAsync(MessageReaction messageReaction, CancellationToken cancellationToken = default)
    {
        context.MessageReactions.Add(messageReaction);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(MessageReaction), messageReaction.Id);
        return messageReaction;
    }

    public Task<MessageReaction?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.MessageReactions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<MessageReaction>> ListAsync(CancellationToken cancellationToken = default)
        => await context.MessageReactions.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var messageReaction = await context.MessageReactions.FindAsync([id], cancellationToken);
        if (messageReaction is null)
        {
            return false;
        }

        context.MessageReactions.Remove(messageReaction);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(MessageReaction), id);
        return true;
    }
}
