namespace SocialLight.Gaming.Contracts;

/// <summary>
/// Write DTO for creating a <c>PlayerProfile</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreatePlayerProfileRequest(
    Guid UserId,
    string Nickname,
    int Ranking,
    int Level
);
