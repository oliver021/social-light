namespace SocialLight.Jobs.Contracts;

/// <summary>
/// Read DTO for <c>JobPosition</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record JobPositionDto(
    Guid Id,
    Guid? JobCategoryId,
    Guid OrganizationId,
    string Title,
    string Description,
    string? SalaryRange,
    string? Location,
    string EmploymentType
);
