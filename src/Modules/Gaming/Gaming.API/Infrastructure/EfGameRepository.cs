using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IGameRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfGameRepository(
    GamingDbContext context,
    ILogger<EfGameRepository> logger) : IGameRepository
{
    public async Task<Game> AddAsync(Game game, CancellationToken cancellationToken = default)
    {
        context.Games.Add(game);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Game), game.Id);
        return game;
    }

    public Task<Game?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Games.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Game>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Games.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var game = await context.Games.FindAsync([id], cancellationToken);
        if (game is null)
        {
            return false;
        }

        context.Games.Remove(game);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Game), id);
        return true;
    }
}
