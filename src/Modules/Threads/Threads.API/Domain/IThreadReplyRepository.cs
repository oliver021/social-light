namespace SocialLight.Threads.Domain;

/// <summary>
/// Repository PORT for <c>ThreadReply</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IThreadReplyRepository
{
    Task<ThreadReply> AddAsync(ThreadReply threadReply, CancellationToken cancellationToken = default);

    Task<ThreadReply?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ThreadReply>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
