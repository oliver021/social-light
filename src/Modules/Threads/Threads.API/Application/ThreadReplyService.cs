using Microsoft.Extensions.Logging;

namespace SocialLight.Threads.API.Application;

/// <summary>
/// Application service for <c>ThreadReply</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ThreadReplyService(
    IThreadReplyRepository repository,
    ILogger<ThreadReplyService> logger)
{
    public Task<ThreadReply?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<ThreadReply>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<ThreadReply> CreateAsync(
        Guid threadId,
        Guid authorId,
        Guid? parentReplyId,
        string body,
        CancellationToken cancellationToken = default)
    {
        var threadReply = new ThreadReply(
            threadId,
            authorId,
            parentReplyId,
            body
        );

        await repository.AddAsync(threadReply, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(ThreadReply), threadReply.Id);
        return threadReply;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
