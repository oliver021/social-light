namespace SocialLight.Posts.Contracts;

/// <summary>
/// Write DTO for creating a <c>PostMedia</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreatePostMediaRequest(
    Guid PostId,
    string FileUrl,
    string MediaType,
    int Position
);
