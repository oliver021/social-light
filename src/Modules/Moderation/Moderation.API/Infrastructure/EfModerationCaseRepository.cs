using Microsoft.Extensions.Logging;

namespace SocialLight.Moderation.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IModerationCaseRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfModerationCaseRepository(
    ModerationDbContext context,
    ILogger<EfModerationCaseRepository> logger) : IModerationCaseRepository
{
    public async Task<ModerationCase> AddAsync(ModerationCase moderationCase, CancellationToken cancellationToken = default)
    {
        context.ModerationCases.Add(moderationCase);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(ModerationCase), moderationCase.Id);
        return moderationCase;
    }

    public Task<ModerationCase?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.ModerationCases.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ModerationCase>> ListAsync(CancellationToken cancellationToken = default)
        => await context.ModerationCases.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var moderationCase = await context.ModerationCases.FindAsync([id], cancellationToken);
        if (moderationCase is null)
        {
            return false;
        }

        context.ModerationCases.Remove(moderationCase);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(ModerationCase), id);
        return true;
    }
}
