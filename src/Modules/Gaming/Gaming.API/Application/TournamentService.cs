using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Application;

/// <summary>
/// Application service for <c>Tournament</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port, publishing the module's integration events on state change.
/// </summary>
public class TournamentService(
    ITournamentRepository repository,
    IEventBus eventBus,
    ILogger<TournamentService> logger)
{
    public Task<Tournament?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Tournament>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Tournament> CreateAsync(
        Guid gameId,
        Guid organizerId,
        DateTime startDate,
        decimal? prizePool,
        CancellationToken cancellationToken = default)
    {
        var tournament = new Tournament(
            gameId,
            organizerId,
            startDate,
            prizePool
        );

        await repository.AddAsync(tournament, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Tournament), tournament.Id);
        await eventBus.PublishAsync(new TournamentCreated());
        return tournament;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
