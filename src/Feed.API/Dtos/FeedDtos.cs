namespace SocialLight.Feed.API.Dtos;

/// <summary>Minimal author summary shown alongside a feed item.</summary>
public record FeedAuthorDto(Guid UserId, string DisplayName, string? AvatarUrl);

/// <summary>
/// A ranked feed entry: the post plus the cross-module enrichment (author from
/// Profile, engagement counts from Engagement) and the computed <see cref="Score"/>.
/// The shape is stable across the fan-out-on-read MVP and a future read-model.
/// </summary>
public record FeedItemDto(
    Guid PostId,
    Guid AuthorId,
    string? Body,
    string ContentType,
    string Visibility,
    DateTime? PublishedAt,
    FeedAuthorDto? Author,
    int CommentCount,
    int ReactionCount,
    double Score);
