using Microsoft.Extensions.Logging;

namespace SocialLight.Events.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IEventRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfEventRepository(
    EventsDbContext context,
    ILogger<EfEventRepository> logger) : IEventRepository
{
    public async Task<Event> AddAsync(Event @event, CancellationToken cancellationToken = default)
    {
        context.Events.Add(@event);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Event), @event.Id);
        return @event;
    }

    public Task<Event?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Events.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Event>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Events.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var @event = await context.Events.FindAsync([id], cancellationToken);
        if (@event is null)
        {
            return false;
        }

        context.Events.Remove(@event);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Event), id);
        return true;
    }
}
