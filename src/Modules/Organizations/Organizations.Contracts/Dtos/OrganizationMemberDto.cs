namespace SocialLight.Organizations.Contracts;

/// <summary>
/// Read DTO for <c>OrganizationMember</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record OrganizationMemberDto(
    Guid Id,
    Guid OrganizationId,
    Guid UserId,
    string Role
);
