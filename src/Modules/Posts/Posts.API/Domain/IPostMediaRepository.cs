namespace SocialLight.Posts.Domain;

/// <summary>
/// Repository PORT for <c>PostMedia</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IPostMediaRepository
{
    Task<PostMedia> AddAsync(PostMedia postMedia, CancellationToken cancellationToken = default);

    Task<PostMedia?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<PostMedia>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
