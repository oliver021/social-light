namespace SocialLight.Chat.Domain;

/// <summary>
/// Repository PORT for <c>ChatPin</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IChatPinRepository
{
    Task<ChatPin> AddAsync(ChatPin chatPin, CancellationToken cancellationToken = default);

    Task<ChatPin?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChatPin>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
