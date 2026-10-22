using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="ITopicRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfTopicRepository(
    RecommendationDbContext context,
    ILogger<EfTopicRepository> logger) : ITopicRepository
{
    public async Task<Topic> AddAsync(Topic topic, CancellationToken cancellationToken = default)
    {
        context.Topics.Add(topic);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Topic), topic.Id);
        return topic;
    }

    public Task<Topic?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Topics.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Topic>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Topics.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var topic = await context.Topics.FindAsync([id], cancellationToken);
        if (topic is null)
        {
            return false;
        }

        context.Topics.Remove(topic);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Topic), id);
        return true;
    }
}
