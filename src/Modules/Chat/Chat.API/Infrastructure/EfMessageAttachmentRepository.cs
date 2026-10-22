using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IMessageAttachmentRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfMessageAttachmentRepository(
    ChatDbContext context,
    ILogger<EfMessageAttachmentRepository> logger) : IMessageAttachmentRepository
{
    public async Task<MessageAttachment> AddAsync(MessageAttachment messageAttachment, CancellationToken cancellationToken = default)
    {
        context.MessageAttachments.Add(messageAttachment);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(MessageAttachment), messageAttachment.Id);
        return messageAttachment;
    }

    public Task<MessageAttachment?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.MessageAttachments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<MessageAttachment>> ListAsync(CancellationToken cancellationToken = default)
        => await context.MessageAttachments.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var messageAttachment = await context.MessageAttachments.FindAsync([id], cancellationToken);
        if (messageAttachment is null)
        {
            return false;
        }

        context.MessageAttachments.Remove(messageAttachment);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(MessageAttachment), id);
        return true;
    }
}
