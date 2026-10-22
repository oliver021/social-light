namespace SocialLight.Groups.Contracts;

/// <summary>
/// Write DTO for creating a <c>GroupMember</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateGroupMemberRequest(
    Guid GroupId,
    Guid UserId,
    string Role
);
