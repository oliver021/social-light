namespace SocialLight.Moderation.Domain;

/// <summary>
/// <c>Appeal</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Appeal
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ModerationCaseId { get; private set; }
    public Guid AppellantId { get; private set; }
    public string Reason { get; private set; } = default!;
    public string Status { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Appeal() { }

    public Appeal(
        Guid moderationCaseId,
        Guid appellantId,
        string reason,
        string status
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(reason);
        ArgumentException.ThrowIfNullOrWhiteSpace(status);
        ModerationCaseId = moderationCaseId;
        AppellantId = appellantId;
        Reason = reason;
        Status = status;
    }
}
