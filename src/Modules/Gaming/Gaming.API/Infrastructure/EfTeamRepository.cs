using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="ITeamRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfTeamRepository(
    GamingDbContext context,
    ILogger<EfTeamRepository> logger) : ITeamRepository
{
    public async Task<Team> AddAsync(Team team, CancellationToken cancellationToken = default)
    {
        context.Teams.Add(team);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Team), team.Id);
        return team;
    }

    public Task<Team?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Teams.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Team>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Teams.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var team = await context.Teams.FindAsync([id], cancellationToken);
        if (team is null)
        {
            return false;
        }

        context.Teams.Remove(team);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Team), id);
        return true;
    }
}
