using Microsoft.Extensions.Logging;

namespace SocialLight.Stories.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IStoryRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfStoryRepository(
    StoriesDbContext context,
    ILogger<EfStoryRepository> logger) : IStoryRepository
{
    public async Task<Story> AddAsync(Story story, CancellationToken cancellationToken = default)
    {
        context.Stories.Add(story);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Story), story.Id);
        return story;
    }

    public Task<Story?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Stories.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Story>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Stories.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var story = await context.Stories.FindAsync([id], cancellationToken);
        if (story is null)
        {
            return false;
        }

        context.Stories.Remove(story);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Story), id);
        return true;
    }
}
