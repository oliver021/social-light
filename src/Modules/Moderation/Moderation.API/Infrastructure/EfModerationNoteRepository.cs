using Microsoft.Extensions.Logging;

namespace SocialLight.Moderation.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IModerationNoteRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfModerationNoteRepository(
    ModerationDbContext context,
    ILogger<EfModerationNoteRepository> logger) : IModerationNoteRepository
{
    public async Task<ModerationNote> AddAsync(ModerationNote moderationNote, CancellationToken cancellationToken = default)
    {
        context.ModerationNotes.Add(moderationNote);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(ModerationNote), moderationNote.Id);
        return moderationNote;
    }

    public Task<ModerationNote?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.ModerationNotes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<ModerationNote>> ListAsync(CancellationToken cancellationToken = default)
        => await context.ModerationNotes.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var moderationNote = await context.ModerationNotes.FindAsync([id], cancellationToken);
        if (moderationNote is null)
        {
            return false;
        }

        context.ModerationNotes.Remove(moderationNote);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(ModerationNote), id);
        return true;
    }
}
