namespace SocialLight.Groups.Contracts;

/// <summary>
/// Write DTO for creating a <c>GroupMember</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (UserId) — bound server-side from the authenticated principal.
/// </summary>
public record CreateGroupMemberRequest(
    Guid GroupId,
    string Role
);
