namespace SocialLight.Reels.Contracts;

/// <summary>
/// Write DTO for creating a <c>Reel</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateReelRequest(
    Guid CreatorId,
    string VideoUrl,
    string? Caption,
    int Duration,
    string Visibility,
    Guid? MusicTrackId
);
