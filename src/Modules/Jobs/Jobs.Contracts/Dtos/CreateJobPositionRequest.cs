namespace SocialLight.Jobs.Contracts;

/// <summary>
/// Write DTO for creating a <c>JobPosition</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateJobPositionRequest(
    Guid? JobCategoryId,
    Guid OrganizationId,
    string Title,
    string Description,
    string? SalaryRange,
    string? Location,
    string EmploymentType
);
