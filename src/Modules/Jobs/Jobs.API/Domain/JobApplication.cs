namespace SocialLight.Jobs.Domain;

/// <summary>
/// <c>JobApplication</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class JobApplication
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ApplicantId { get; private set; }
    public Guid JobPositionId { get; private set; }
    public Guid? ResumeId { get; private set; }
    public string? CoverLetter { get; private set; }
    public string Status { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected JobApplication() { }

    public JobApplication(
        Guid applicantId,
        Guid jobPositionId,
        Guid? resumeId,
        string? coverLetter,
        string status
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(status);
        ApplicantId = applicantId;
        JobPositionId = jobPositionId;
        ResumeId = resumeId;
        CoverLetter = coverLetter;
        Status = status;
    }
}
