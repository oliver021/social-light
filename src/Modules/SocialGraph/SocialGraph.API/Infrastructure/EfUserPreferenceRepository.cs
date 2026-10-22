using Microsoft.Extensions.Logging;

namespace SocialLight.SocialGraph.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IUserPreferenceRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfUserPreferenceRepository(
    SocialGraphDbContext context,
    ILogger<EfUserPreferenceRepository> logger) : IUserPreferenceRepository
{
    public async Task<UserPreference> AddAsync(UserPreference userPreference, CancellationToken cancellationToken = default)
    {
        context.UserPreferences.Add(userPreference);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(UserPreference), userPreference.Id);
        return userPreference;
    }

    public Task<UserPreference?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.UserPreferences.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<UserPreference>> ListAsync(CancellationToken cancellationToken = default)
        => await context.UserPreferences.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userPreference = await context.UserPreferences.FindAsync([id], cancellationToken);
        if (userPreference is null)
        {
            return false;
        }

        context.UserPreferences.Remove(userPreference);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(UserPreference), id);
        return true;
    }
}
