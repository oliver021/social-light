namespace SocialLight.Stories.Domain;

/// <summary>
/// Repository PORT for <c>StoryView</c> (DESIGN-STRATEGY.md §4). It lives in the
/// module's domain; the module depends on this abstraction, never on the EF adapter
/// or the Postgres binding. Decoupling is by dependency inversion, not folders.
/// </summary>
public interface IStoryViewRepository
{
    Task<StoryView> AddAsync(StoryView storyView, CancellationToken cancellationToken = default);

    Task<StoryView?> GetAsync(Guid id, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<StoryView>> ListAsync(CancellationToken cancellationToken = default);

    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
}
