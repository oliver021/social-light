using Microsoft.Extensions.Logging;

namespace SocialLight.Moderation.API.Application;

/// <summary>
/// Application service for <c>ModerationNote</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class ModerationNoteService(
    IModerationNoteRepository repository,
    ILogger<ModerationNoteService> logger)
{
    public Task<ModerationNote?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<ModerationNote>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<ModerationNote> CreateAsync(
        Guid moderationCaseId,
        Guid moderatorId,
        string note,
        CancellationToken cancellationToken = default)
    {
        var moderationNote = new ModerationNote(
            moderationCaseId,
            moderatorId,
            note
        );

        await repository.AddAsync(moderationNote, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(ModerationNote), moderationNote.Id);
        return moderationNote;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
