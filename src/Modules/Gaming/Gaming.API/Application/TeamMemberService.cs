using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Application;

/// <summary>
/// Application service for <c>TeamMember</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class TeamMemberService(
    ITeamMemberRepository repository,
    ILogger<TeamMemberService> logger)
{
    public Task<TeamMember?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<TeamMember>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<TeamMember> CreateAsync(
        Guid teamId,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var teamMember = new TeamMember(
            teamId,
            userId,
            role
        );

        await repository.AddAsync(teamMember, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(TeamMember), teamMember.Id);
        return teamMember;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
