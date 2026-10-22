namespace SocialLight.Moderation.Domain;

/// <summary>
/// <c>Report</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Report
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ReporterId { get; private set; }
    public string TargetType { get; private set; } = default!;
    public Guid TargetId { get; private set; }
    public string Category { get; private set; } = default!;
    public string Status { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Report() { }

    public Report(
        Guid reporterId,
        string targetType,
        Guid targetId,
        string category,
        string status
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(targetType);
        ArgumentException.ThrowIfNullOrWhiteSpace(category);
        ArgumentException.ThrowIfNullOrWhiteSpace(status);
        ReporterId = reporterId;
        TargetType = targetType;
        TargetId = targetId;
        Category = category;
        Status = status;
    }
}
