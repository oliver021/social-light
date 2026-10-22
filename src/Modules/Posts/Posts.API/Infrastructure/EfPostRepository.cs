using Microsoft.Extensions.Logging;

namespace SocialLight.Posts.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IPostRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfPostRepository(
    PostsDbContext context,
    ILogger<EfPostRepository> logger) : IPostRepository
{
    public async Task<Post> AddAsync(Post post, CancellationToken cancellationToken = default)
    {
        context.Posts.Add(post);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Post), post.Id);
        return post;
    }

    public Task<Post?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Posts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Post>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Posts.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var post = await context.Posts.FindAsync([id], cancellationToken);
        if (post is null)
        {
            return false;
        }

        context.Posts.Remove(post);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Post), id);
        return true;
    }
}
