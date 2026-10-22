using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IMessageRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfMessageRepository(
    ChatDbContext context,
    ILogger<EfMessageRepository> logger) : IMessageRepository
{
    public async Task<Message> AddAsync(Message message, CancellationToken cancellationToken = default)
    {
        context.Messages.Add(message);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Message), message.Id);
        return message;
    }

    public Task<Message?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Messages.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Message>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Messages.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var message = await context.Messages.FindAsync([id], cancellationToken);
        if (message is null)
        {
            return false;
        }

        context.Messages.Remove(message);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Message), id);
        return true;
    }
}
