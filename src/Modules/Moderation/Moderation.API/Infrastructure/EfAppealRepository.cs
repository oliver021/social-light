using Microsoft.Extensions.Logging;

namespace SocialLight.Moderation.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IAppealRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfAppealRepository(
    ModerationDbContext context,
    ILogger<EfAppealRepository> logger) : IAppealRepository
{
    public async Task<Appeal> AddAsync(Appeal appeal, CancellationToken cancellationToken = default)
    {
        context.Appeals.Add(appeal);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Appeal), appeal.Id);
        return appeal;
    }

    public Task<Appeal?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Appeals.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Appeal>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Appeals.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var appeal = await context.Appeals.FindAsync([id], cancellationToken);
        if (appeal is null)
        {
            return false;
        }

        context.Appeals.Remove(appeal);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Appeal), id);
        return true;
    }
}
