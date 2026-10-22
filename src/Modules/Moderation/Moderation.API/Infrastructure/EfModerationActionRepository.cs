using Microsoft.Extensions.Logging;

namespace SocialLight.Moderation.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IModerationActionRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfModerationActionRepository(
    ModerationDbContext context,
    ILogger<EfModerationActionRepository> logger) : IModerationActionRepository
{
    public async Task<ModerationAction> AddAsync(ModerationAction moderationAction, CancellationToken cancellationToken = default)
    {
        context.ModerationActions.Add(moderationAction);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(ModerationAction), moderationAction.Id);
        return moderationAction;
    }

    public Task<ModerationAction?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.ModerationActions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ModerationAction>> ListAsync(CancellationToken cancellationToken = default)
        => await context.ModerationActions.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var moderationAction = await context.ModerationActions.FindAsync([id], cancellationToken);
        if (moderationAction is null)
        {
            return false;
        }

        context.ModerationActions.Remove(moderationAction);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(ModerationAction), id);
        return true;
    }
}
