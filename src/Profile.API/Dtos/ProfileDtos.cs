namespace SocialLight.Profile.API.Dtos;

/// <summary>Wire shape of a profile returned by the API and consumed by clients.</summary>
public record ProfileDto(
    Guid UserId,
    string DisplayName,
    string? Handle,
    string? Bio,
    string? AvatarUrl,
    string? Location,
    DateTime CreatedAt,
    DateTime UpdatedAt);

/// <summary>
/// Write DTO for editing the caller's own profile. The owner is never in the body —
/// it's the authenticated user (sub), like the generated modules' owner-binding.
/// </summary>
public record UpdateProfileRequest(
    string DisplayName,
    string? Bio,
    string? AvatarUrl,
    string? Location,
    string? Handle);
