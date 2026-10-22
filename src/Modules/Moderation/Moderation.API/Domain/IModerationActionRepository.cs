namespace SocialLight.Moderation.Domain;

/// <summary>
/// Repository PORT for <c>ModerationAction</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IModerationActionRepository
{
    Task<ModerationAction> AddAsync(ModerationAction moderationAction, CancellationToken cancellationToken = default);

    Task<ModerationAction?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ModerationAction>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
