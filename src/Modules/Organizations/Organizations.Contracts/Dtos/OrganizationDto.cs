namespace SocialLight.Organizations.Contracts;

/// <summary>
/// Read DTO for <c>Organization</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record OrganizationDto(
    Guid Id,
    Guid OwnerId,
    string Name,
    string? Description,
    string? Logo,
    string VerificationStatus
);
