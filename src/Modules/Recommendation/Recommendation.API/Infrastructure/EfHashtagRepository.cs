using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IHashtagRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfHashtagRepository(
    RecommendationDbContext context,
    ILogger<EfHashtagRepository> logger) : IHashtagRepository
{
    public async Task<Hashtag> AddAsync(Hashtag hashtag, CancellationToken cancellationToken = default)
    {
        context.Hashtags.Add(hashtag);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Hashtag), hashtag.Id);
        return hashtag;
    }

    public Task<Hashtag?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Hashtags.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Hashtag>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Hashtags.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var hashtag = await context.Hashtags.FindAsync([id], cancellationToken);
        if (hashtag is null)
        {
            return false;
        }

        context.Hashtags.Remove(hashtag);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Hashtag), id);
        return true;
    }
}
