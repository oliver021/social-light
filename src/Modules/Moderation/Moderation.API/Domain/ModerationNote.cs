namespace SocialLight.Moderation.Domain;

/// <summary>
/// <c>ModerationNote</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class ModerationNote
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ModerationCaseId { get; private set; }
    public Guid ModeratorId { get; private set; }
    public string Note { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected ModerationNote() { }

    public ModerationNote(
        Guid moderationCaseId,
        Guid moderatorId,
        string note
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(note);
        ModerationCaseId = moderationCaseId;
        ModeratorId = moderatorId;
        Note = note;
    }
}
