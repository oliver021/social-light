namespace SocialLight.Events.Domain;

/// <summary>
/// Repository PORT for <c>Event</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IEventRepository
{
    Task<Event> AddAsync(Event @event, CancellationToken cancellationToken = default);

    Task<Event?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Event>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
