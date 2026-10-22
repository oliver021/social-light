using Microsoft.Extensions.Logging;

namespace SocialLight.Events.API.Application;

/// <summary>
/// Application service for <c>EventAttendance</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class EventAttendanceService(
    IEventAttendanceRepository repository,
    ILogger<EventAttendanceService> logger)
{
    public Task<EventAttendance?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<EventAttendance>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<EventAttendance> CreateAsync(
        Guid eventId,
        Guid userId,
        string status,
        CancellationToken cancellationToken = default)
    {
        var eventAttendance = new EventAttendance(
            eventId,
            userId,
            status
        );

        await repository.AddAsync(eventAttendance, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(EventAttendance), eventAttendance.Id);
        return eventAttendance;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
