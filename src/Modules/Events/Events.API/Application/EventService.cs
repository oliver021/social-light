using Microsoft.Extensions.Logging;

namespace SocialLight.Events.API.Application;

/// <summary>
/// Application service for <c>Event</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port, publishing the module's integration events on state change.
/// </summary>
public class EventService(
    IEventRepository repository,
    IEventBus eventBus,
    ILogger<EventService> logger)
{
    public Task<Event?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Event>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Event> CreateAsync(
        Guid organizerId,
        string title,
        string? description,
        string? location,
        DateTime startDate,
        DateTime endDate,
        int? capacity,
        string visibility,
        CancellationToken cancellationToken = default)
    {
        var @event = new Event(
            organizerId,
            title,
            description,
            location,
            startDate,
            endDate,
            capacity,
            visibility
        );

        await repository.AddAsync(@event, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Event), @event.Id);
        await eventBus.PublishAsync(new EventCreated());
        return @event;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
