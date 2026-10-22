using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="ITeamMemberRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfTeamMemberRepository(
    GamingDbContext context,
    ILogger<EfTeamMemberRepository> logger) : ITeamMemberRepository
{
    public async Task<TeamMember> AddAsync(TeamMember teamMember, CancellationToken cancellationToken = default)
    {
        context.TeamMembers.Add(teamMember);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(TeamMember), teamMember.Id);
        return teamMember;
    }

    public Task<TeamMember?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.TeamMembers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<TeamMember>> ListAsync(CancellationToken cancellationToken = default)
        => await context.TeamMembers.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var teamMember = await context.TeamMembers.FindAsync([id], cancellationToken);
        if (teamMember is null)
        {
            return false;
        }

        context.TeamMembers.Remove(teamMember);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(TeamMember), id);
        return true;
    }
}
