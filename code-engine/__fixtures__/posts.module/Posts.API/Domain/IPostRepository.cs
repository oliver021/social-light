namespace SocialLight.Posts.Domain;

/// <summary>
/// Repository PORT for <c>Post</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IPostRepository
{
    Task<Post> AddAsync(Post post, CancellationToken cancellationToken = default);

    Task<Post?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Post>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
