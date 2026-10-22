namespace SocialLight.Stories.Contracts;

/// <summary>
/// Read DTO for <c>StoryReply</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record StoryReplyDto(
    Guid Id,
    Guid StoryId,
    Guid UserId,
    string Body
);
