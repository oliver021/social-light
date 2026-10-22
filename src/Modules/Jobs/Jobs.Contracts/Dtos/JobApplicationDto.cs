namespace SocialLight.Jobs.Contracts;

/// <summary>
/// Read DTO for <c>JobApplication</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record JobApplicationDto(
    Guid Id,
    Guid ApplicantId,
    Guid JobPositionId,
    Guid? ResumeId,
    string? CoverLetter,
    string Status
);
