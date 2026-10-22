namespace SocialLight.Chat.Domain;

/// <summary>
/// Repository PORT for <c>ChatRequest</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IChatRequestRepository
{
    Task<ChatRequest> AddAsync(ChatRequest chatRequest, CancellationToken cancellationToken = default);

    Task<ChatRequest?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ChatRequest>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
