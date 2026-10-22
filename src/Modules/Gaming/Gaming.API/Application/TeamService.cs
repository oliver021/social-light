using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Application;

/// <summary>
/// Application service for <c>Team</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class TeamService(
    ITeamRepository repository,
    ILogger<TeamService> logger)
{
    public Task<Team?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Team>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Team> CreateAsync(
        Guid gameId,
        string name,
        Guid ownerId,
        CancellationToken cancellationToken = default)
    {
        var team = new Team(
            gameId,
            name,
            ownerId
        );

        await repository.AddAsync(team, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Team), team.Id);
        return team;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
