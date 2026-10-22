namespace socialLight.Posts.API.Model;

// Request DTOs for Post. The key field is server-assigned and omitted.
public record CreatePostRequest(
    Guid AuthorId,
    string Content,
    string? MediaUrl,
    DateTime CreatedAt
);

public record UpdatePostRequest(
    Guid AuthorId,
    string Content,
    string? MediaUrl,
    DateTime CreatedAt
);
