namespace SocialLight.Pages.Contracts;

/// <summary>
/// Write DTO for creating a <c>PageRole</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreatePageRoleRequest(
    Guid PageId,
    Guid UserId,
    string Role
);
