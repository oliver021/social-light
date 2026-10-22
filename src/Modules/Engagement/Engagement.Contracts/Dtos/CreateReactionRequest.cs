namespace SocialLight.Engagement.Contracts;

/// <summary>
/// Write DTO for creating a <c>Reaction</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body, as are
/// owner fields (UserId) — bound server-side from the authenticated principal.
/// </summary>
public record CreateReactionRequest(
    string TargetType,
    Guid TargetId,
    string ReactionType
);
