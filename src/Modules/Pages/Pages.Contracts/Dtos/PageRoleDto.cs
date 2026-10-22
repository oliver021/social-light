namespace SocialLight.Pages.Contracts;

/// <summary>
/// Read DTO for <c>PageRole</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record PageRoleDto(
    Guid Id,
    Guid PageId,
    Guid UserId,
    string Role
);
