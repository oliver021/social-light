namespace SocialLight.Threads.Domain;

/// <summary>
/// Repository PORT for <c>Thread</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IThreadRepository
{
    Task<global::SocialLight.Threads.Domain.Thread> AddAsync(global::SocialLight.Threads.Domain.Thread thread, CancellationToken cancellationToken = default);

    Task<global::SocialLight.Threads.Domain.Thread?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<global::SocialLight.Threads.Domain.Thread>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
