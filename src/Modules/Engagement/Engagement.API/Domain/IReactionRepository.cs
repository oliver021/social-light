namespace SocialLight.Engagement.Domain;

/// <summary>
/// Repository PORT for <c>Reaction</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IReactionRepository
{
    Task<Reaction> AddAsync(Reaction reaction, CancellationToken cancellationToken = default);

    Task<Reaction?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Reaction>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
