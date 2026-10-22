using Microsoft.Extensions.Logging;

namespace SocialLight.Threads.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IThreadReplyRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfThreadReplyRepository(
    ThreadsDbContext context,
    ILogger<EfThreadReplyRepository> logger) : IThreadReplyRepository
{
    public async Task<ThreadReply> AddAsync(ThreadReply threadReply, CancellationToken cancellationToken = default)
    {
        context.ThreadReplies.Add(threadReply);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(ThreadReply), threadReply.Id);
        return threadReply;
    }

    public Task<ThreadReply?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.ThreadReplies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ThreadReply>> ListAsync(CancellationToken cancellationToken = default)
        => await context.ThreadReplies.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var threadReply = await context.ThreadReplies.FindAsync([id], cancellationToken);
        if (threadReply is null)
        {
            return false;
        }

        context.ThreadReplies.Remove(threadReply);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(ThreadReply), id);
        return true;
    }
}
