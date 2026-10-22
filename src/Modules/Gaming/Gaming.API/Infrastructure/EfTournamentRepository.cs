using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="ITournamentRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfTournamentRepository(
    GamingDbContext context,
    ILogger<EfTournamentRepository> logger) : ITournamentRepository
{
    public async Task<Tournament> AddAsync(Tournament tournament, CancellationToken cancellationToken = default)
    {
        context.Tournaments.Add(tournament);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Tournament), tournament.Id);
        return tournament;
    }

    public Task<Tournament?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Tournaments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Tournament>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Tournaments.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var tournament = await context.Tournaments.FindAsync([id], cancellationToken);
        if (tournament is null)
        {
            return false;
        }

        context.Tournaments.Remove(tournament);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Tournament), id);
        return true;
    }
}
