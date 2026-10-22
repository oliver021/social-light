namespace SocialLight.Gaming.Contracts;

/// <summary>
/// Write DTO for creating a <c>Team</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateTeamRequest(
    Guid GameId,
    string Name,
    Guid OwnerId
);
