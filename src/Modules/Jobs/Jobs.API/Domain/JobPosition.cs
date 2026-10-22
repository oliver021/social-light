namespace SocialLight.Jobs.Domain;

/// <summary>
/// <c>JobPosition</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class JobPosition
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid? JobCategoryId { get; private set; }
    public Guid OrganizationId { get; private set; }
    public string Title { get; private set; } = default!;
    public string Description { get; private set; } = default!;
    public string? SalaryRange { get; private set; }
    public string? Location { get; private set; }
    public string EmploymentType { get; private set; } = default!;
    public ICollection<JobApplication> JobApplications { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected JobPosition() { }

    public JobPosition(
        Guid? jobCategoryId,
        Guid organizationId,
        string title,
        string description,
        string? salaryRange,
        string? location,
        string employmentType
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(title);
        ArgumentException.ThrowIfNullOrWhiteSpace(description);
        ArgumentException.ThrowIfNullOrWhiteSpace(employmentType);
        JobCategoryId = jobCategoryId;
        OrganizationId = organizationId;
        Title = title;
        Description = description;
        SalaryRange = salaryRange;
        Location = location;
        EmploymentType = employmentType;
    }
}
