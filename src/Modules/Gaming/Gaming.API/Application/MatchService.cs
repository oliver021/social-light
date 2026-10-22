using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Application;

/// <summary>
/// Application service for <c>Match</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class MatchService(
    IMatchRepository repository,
    ILogger<MatchService> logger)
{
    public Task<Match?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Match>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Match> CreateAsync(
        Guid gameId,
        Guid? tournamentId,
        string status,
        CancellationToken cancellationToken = default)
    {
        var match = new Match(
            gameId,
            tournamentId,
            status
        );

        await repository.AddAsync(match, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Match), match.Id);
        return match;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
