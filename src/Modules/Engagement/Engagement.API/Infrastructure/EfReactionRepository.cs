using Microsoft.Extensions.Logging;

namespace SocialLight.Engagement.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IReactionRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfReactionRepository(
    EngagementDbContext context,
    ILogger<EfReactionRepository> logger) : IReactionRepository
{
    public async Task<Reaction> AddAsync(Reaction reaction, CancellationToken cancellationToken = default)
    {
        context.Reactions.Add(reaction);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Reaction), reaction.Id);
        return reaction;
    }

    public Task<Reaction?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Reactions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Reaction>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Reactions.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var reaction = await context.Reactions.FindAsync([id], cancellationToken);
        if (reaction is null)
        {
            return false;
        }

        context.Reactions.Remove(reaction);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Reaction), id);
        return true;
    }
}
