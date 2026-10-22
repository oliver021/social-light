namespace SocialLight.Chat.Domain;

/// <summary>
/// Repository PORT for <c>MessageReadReceipt</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IMessageReadReceiptRepository
{
    Task<MessageReadReceipt> AddAsync(MessageReadReceipt messageReadReceipt, CancellationToken cancellationToken = default);

    Task<MessageReadReceipt?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<MessageReadReceipt>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
