namespace SocialLight.Chat.Domain;

/// <summary>
/// Repository PORT for <c>Chat</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IChatRepository
{
    Task<global::SocialLight.Chat.Domain.Chat> AddAsync(global::SocialLight.Chat.Domain.Chat chat, CancellationToken cancellationToken = default);

    Task<global::SocialLight.Chat.Domain.Chat?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<global::SocialLight.Chat.Domain.Chat>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
