namespace SocialLight.Moderation.Domain;

/// <summary>
/// Repository PORT for <c>ModerationNote</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IModerationNoteRepository
{
    Task<ModerationNote> AddAsync(ModerationNote moderationNote, CancellationToken cancellationToken = default);

    Task<ModerationNote?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<ModerationNote>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
