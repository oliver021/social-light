namespace SocialLight.Chat.Domain;

/// <summary>
/// Repository PORT for <c>MessageAttachment</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IMessageAttachmentRepository
{
    Task<MessageAttachment> AddAsync(MessageAttachment messageAttachment, CancellationToken cancellationToken = default);

    Task<MessageAttachment?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MessageAttachment>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
