namespace SocialLight.Groups.Contracts;

/// <summary>
/// Read DTO for <c>Group</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record GroupDto(
    Guid Id,
    string Name,
    string? Description,
    string? Avatar,
    string? CoverImage,
    string PrivacyType,
    bool ApprovalRequired
);
