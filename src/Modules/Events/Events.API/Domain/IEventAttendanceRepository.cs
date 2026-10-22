namespace SocialLight.Events.Domain;

/// <summary>
/// Repository PORT for <c>EventAttendance</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IEventAttendanceRepository
{
    Task<EventAttendance> AddAsync(EventAttendance eventAttendance, CancellationToken cancellationToken = default);

    Task<EventAttendance?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<EventAttendance>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
