using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IMatchRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfMatchRepository(
    GamingDbContext context,
    ILogger<EfMatchRepository> logger) : IMatchRepository
{
    public async Task<Match> AddAsync(Match match, CancellationToken cancellationToken = default)
    {
        context.Matches.Add(match);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Match), match.Id);
        return match;
    }

    public Task<Match?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Matches.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Match>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Matches.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var match = await context.Matches.FindAsync([id], cancellationToken);
        if (match is null)
        {
            return false;
        }

        context.Matches.Remove(match);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Match), id);
        return true;
    }
}
