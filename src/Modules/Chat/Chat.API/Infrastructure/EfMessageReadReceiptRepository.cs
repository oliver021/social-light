using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IMessageReadReceiptRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfMessageReadReceiptRepository(
    ChatDbContext context,
    ILogger<EfMessageReadReceiptRepository> logger) : IMessageReadReceiptRepository
{
    public async Task<MessageReadReceipt> AddAsync(MessageReadReceipt messageReadReceipt, CancellationToken cancellationToken = default)
    {
        context.MessageReadReceipts.Add(messageReadReceipt);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(MessageReadReceipt), messageReadReceipt.Id);
        return messageReadReceipt;
    }

    public Task<MessageReadReceipt?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.MessageReadReceipts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<MessageReadReceipt>> ListAsync(CancellationToken cancellationToken = default)
        => await context.MessageReadReceipts.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var messageReadReceipt = await context.MessageReadReceipts.FindAsync([id], cancellationToken);
        if (messageReadReceipt is null)
        {
            return false;
        }

        context.MessageReadReceipts.Remove(messageReadReceipt);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(MessageReadReceipt), id);
        return true;
    }
}
