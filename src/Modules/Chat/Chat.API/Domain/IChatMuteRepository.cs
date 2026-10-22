namespace SocialLight.Chat.Domain;

/// <summary>
/// Repository PORT for <c>ChatMute</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IChatMuteRepository
{
    Task<ChatMute> AddAsync(ChatMute chatMute, CancellationToken cancellationToken = default);

    Task<ChatMute?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChatMute>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
