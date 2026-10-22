namespace SocialLight.Gaming.Contracts;

/// <summary>
/// Write DTO for creating a <c>TeamMember</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateTeamMemberRequest(
    Guid TeamId,
    Guid UserId,
    string Role
);
