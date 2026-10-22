using Microsoft.Extensions.Logging;

namespace SocialLight.Stories.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IStoryReplyRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfStoryReplyRepository(
    StoriesDbContext context,
    ILogger<EfStoryReplyRepository> logger) : IStoryReplyRepository
{
    public async Task<StoryReply> AddAsync(StoryReply storyReply, CancellationToken cancellationToken = default)
    {
        context.StoryReplies.Add(storyReply);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(StoryReply), storyReply.Id);
        return storyReply;
    }

    public Task<StoryReply?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.StoryReplies.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<StoryReply>> ListAsync(CancellationToken cancellationToken = default)
        => await context.StoryReplies.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var storyReply = await context.StoryReplies.FindAsync([id], cancellationToken);
        if (storyReply is null)
        {
            return false;
        }

        context.StoryReplies.Remove(storyReply);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(StoryReply), id);
        return true;
    }
}
