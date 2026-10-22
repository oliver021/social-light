namespace SocialLight.Groups.Contracts;

/// <summary>
/// Write DTO for creating a <c>Group</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateGroupRequest(
    string Name,
    string? Description,
    string? Avatar,
    string? CoverImage,
    string PrivacyType,
    bool ApprovalRequired
);
