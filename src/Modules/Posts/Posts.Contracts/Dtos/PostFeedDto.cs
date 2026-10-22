namespace SocialLight.Posts.Contracts;

/// <summary>
/// Read DTO for <c>PostFeed</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record PostFeedDto(
    Guid Id,
    Guid PostId,
    string FeedType,
    Guid TargetId
);
