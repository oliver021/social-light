using Microsoft.Extensions.Logging;

namespace SocialLight.Posts.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IPostFeedRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfPostFeedRepository(
    PostsDbContext context,
    ILogger<EfPostFeedRepository> logger) : IPostFeedRepository
{
    public async Task<PostFeed> AddAsync(PostFeed postFeed, CancellationToken cancellationToken = default)
    {
        context.PostFeeds.Add(postFeed);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(PostFeed), postFeed.Id);
        return postFeed;
    }

    public Task<PostFeed?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.PostFeeds.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<PostFeed>> ListAsync(CancellationToken cancellationToken = default)
        => await context.PostFeeds.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var postFeed = await context.PostFeeds.FindAsync([id], cancellationToken);
        if (postFeed is null)
        {
            return false;
        }

        context.PostFeeds.Remove(postFeed);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(PostFeed), id);
        return true;
    }
}
