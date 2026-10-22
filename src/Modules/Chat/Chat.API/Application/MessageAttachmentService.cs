using Microsoft.Extensions.Logging;

namespace SocialLight.Chat.API.Application;

/// <summary>
/// Application service for <c>MessageAttachment</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class MessageAttachmentService(
    IMessageAttachmentRepository repository,
    ILogger<MessageAttachmentService> logger)
{
    public Task<MessageAttachment?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<MessageAttachment>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<MessageAttachment> CreateAsync(
        Guid messageId,
        string fileUrl,
        string mediaType,
        CancellationToken cancellationToken = default)
    {
        var messageAttachment = new MessageAttachment(
            messageId,
            fileUrl,
            mediaType
        );

        await repository.AddAsync(messageAttachment, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(MessageAttachment), messageAttachment.Id);
        return messageAttachment;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
