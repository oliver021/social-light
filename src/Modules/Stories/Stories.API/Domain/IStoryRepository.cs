namespace SocialLight.Stories.Domain;

/// <summary>
/// Repository PORT for <c>Story</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IStoryRepository
{
    Task<Story> AddAsync(Story story, CancellationToken cancellationToken = default);

    Task<Story?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Story>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
