namespace SocialLight.Organizations.Contracts;

/// <summary>
/// Write DTO for creating a <c>OrganizationMember</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateOrganizationMemberRequest(
    Guid OrganizationId,
    Guid UserId,
    string Role
);
