using Microsoft.Extensions.Logging;

namespace SocialLight.Stories.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IStoryViewRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfStoryViewRepository(
    StoriesDbContext context,
    ILogger<EfStoryViewRepository> logger) : IStoryViewRepository
{
    public async Task<StoryView> AddAsync(StoryView storyView, CancellationToken cancellationToken = default)
    {
        context.StoryViews.Add(storyView);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(StoryView), storyView.Id);
        return storyView;
    }

    public Task<StoryView?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.StoryViews.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<StoryView>> ListAsync(CancellationToken cancellationToken = default)
        => await context.StoryViews.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var storyView = await context.StoryViews.FindAsync([id], cancellationToken);
        if (storyView is null)
        {
            return false;
        }

        context.StoryViews.Remove(storyView);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(StoryView), id);
        return true;
    }
}
