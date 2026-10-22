namespace SocialLight.Gaming.Contracts;

/// <summary>
/// Write DTO for creating a <c>Game</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateGameRequest(
    string Name,
    string Type,
    string? Provider,
    string? Source,
    string? Platform
);
