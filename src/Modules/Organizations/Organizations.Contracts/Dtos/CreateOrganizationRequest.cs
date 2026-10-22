namespace SocialLight.Organizations.Contracts;

/// <summary>
/// Write DTO for creating a <c>Organization</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateOrganizationRequest(
    Guid OwnerId,
    string Name,
    string? Description,
    string? Logo,
    string VerificationStatus
);
