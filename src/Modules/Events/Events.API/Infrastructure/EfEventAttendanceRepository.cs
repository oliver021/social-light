using Microsoft.Extensions.Logging;

namespace SocialLight.Events.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IEventAttendanceRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfEventAttendanceRepository(
    EventsDbContext context,
    ILogger<EfEventAttendanceRepository> logger) : IEventAttendanceRepository
{
    public async Task<EventAttendance> AddAsync(EventAttendance eventAttendance, CancellationToken cancellationToken = default)
    {
        context.EventAttendances.Add(eventAttendance);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(EventAttendance), eventAttendance.Id);
        return eventAttendance;
    }

    public Task<EventAttendance?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.EventAttendances.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<EventAttendance>> ListAsync(CancellationToken cancellationToken = default)
        => await context.EventAttendances.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var eventAttendance = await context.EventAttendances.FindAsync([id], cancellationToken);
        if (eventAttendance is null)
        {
            return false;
        }

        context.EventAttendances.Remove(eventAttendance);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(EventAttendance), id);
        return true;
    }
}
