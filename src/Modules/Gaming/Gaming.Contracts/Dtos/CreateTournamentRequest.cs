namespace SocialLight.Gaming.Contracts;

/// <summary>
/// Write DTO for creating a <c>Tournament</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateTournamentRequest(
    Guid GameId,
    Guid OrganizerId,
    DateTime StartDate,
    decimal? PrizePool
);
