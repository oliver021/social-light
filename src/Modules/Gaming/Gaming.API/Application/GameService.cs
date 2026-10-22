using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Application;

/// <summary>
/// Application service for <c>Game</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class GameService(
    IGameRepository repository,
    ILogger<GameService> logger)
{
    public Task<Game?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Game>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Game> CreateAsync(
        string name,
        string type,
        string? provider,
        string? source,
        string? platform,
        CancellationToken cancellationToken = default)
    {
        var game = new Game(
            name,
            type,
            provider,
            source,
            platform
        );

        await repository.AddAsync(game, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Game), game.Id);
        return game;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
