namespace SocialLight.Moderation.Domain;

/// <summary>
/// Repository PORT for <c>ModerationCase</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IModerationCaseRepository
{
    Task<ModerationCase> AddAsync(ModerationCase moderationCase, CancellationToken cancellationToken = default);

    Task<ModerationCase?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ModerationCase>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
