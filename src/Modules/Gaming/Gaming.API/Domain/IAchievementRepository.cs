namespace SocialLight.Gaming.Domain;

/// <summary>
/// Repository PORT for <c>Achievement</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IAchievementRepository
{
    Task<Achievement> AddAsync(Achievement achievement, CancellationToken cancellationToken = default);

    Task<Achievement?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<Achievement>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
