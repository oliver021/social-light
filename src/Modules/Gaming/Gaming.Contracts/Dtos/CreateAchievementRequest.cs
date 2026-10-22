namespace SocialLight.Gaming.Contracts;

/// <summary>
/// Write DTO for creating a <c>Achievement</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateAchievementRequest(
    Guid GameId,
    string Title,
    string? Description
);
