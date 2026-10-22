using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IUserInterestRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfUserInterestRepository(
    RecommendationDbContext context,
    ILogger<EfUserInterestRepository> logger) : IUserInterestRepository
{
    public async Task<UserInterest> AddAsync(UserInterest userInterest, CancellationToken cancellationToken = default)
    {
        context.UserInterests.Add(userInterest);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(UserInterest), userInterest.Id);
        return userInterest;
    }

    public Task<UserInterest?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.UserInterests.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<UserInterest>> ListAsync(CancellationToken cancellationToken = default)
        => await context.UserInterests.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var userInterest = await context.UserInterests.FindAsync([id], cancellationToken);
        if (userInterest is null)
        {
            return false;
        }

        context.UserInterests.Remove(userInterest);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(UserInterest), id);
        return true;
    }
}
