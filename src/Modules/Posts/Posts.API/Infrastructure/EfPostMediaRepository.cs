using Microsoft.Extensions.Logging;

namespace SocialLight.Posts.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IPostMediaRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfPostMediaRepository(
    PostsDbContext context,
    ILogger<EfPostMediaRepository> logger) : IPostMediaRepository
{
    public async Task<PostMedia> AddAsync(PostMedia postMedia, CancellationToken cancellationToken = default)
    {
        context.PostMedias.Add(postMedia);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(PostMedia), postMedia.Id);
        return postMedia;
    }

    public Task<PostMedia?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.PostMedias.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<PostMedia>> ListAsync(CancellationToken cancellationToken = default)
        => await context.PostMedias.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var postMedia = await context.PostMedias.FindAsync([id], cancellationToken);
        if (postMedia is null)
        {
            return false;
        }

        context.PostMedias.Remove(postMedia);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(PostMedia), id);
        return true;
    }
}
