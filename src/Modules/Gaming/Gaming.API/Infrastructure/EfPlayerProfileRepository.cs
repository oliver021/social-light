using Microsoft.Extensions.Logging;

namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IPlayerProfileRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfPlayerProfileRepository(
    GamingDbContext context,
    ILogger<EfPlayerProfileRepository> logger) : IPlayerProfileRepository
{
    public async Task<PlayerProfile> AddAsync(PlayerProfile playerProfile, CancellationToken cancellationToken = default)
    {
        context.PlayerProfiles.Add(playerProfile);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(PlayerProfile), playerProfile.Id);
        return playerProfile;
    }

    public Task<PlayerProfile?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.PlayerProfiles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<PlayerProfile>> ListAsync(CancellationToken cancellationToken = default)
        => await context.PlayerProfiles.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var playerProfile = await context.PlayerProfiles.FindAsync([id], cancellationToken);
        if (playerProfile is null)
        {
            return false;
        }

        context.PlayerProfiles.Remove(playerProfile);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(PlayerProfile), id);
        return true;
    }
}
