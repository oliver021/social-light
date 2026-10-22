namespace SocialLight.Jobs.Contracts;

/// <summary>
/// Write DTO for creating a <c>JobApplication</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateJobApplicationRequest(
    Guid ApplicantId,
    Guid JobPositionId,
    Guid? ResumeId,
    string? CoverLetter,
    string Status
);
