namespace SocialLight.SocialGraph.Contracts;

/// <summary>
/// Write DTO for creating a <c>UserPreference</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateUserPreferenceRequest(
    Guid UserId,
    string EntityType,
    Guid EntityId,
    string PreferenceType,
    DateTime? ExpiresAt
);
