namespace SocialLight.Threads.Contracts;

/// <summary>
/// Write DTO for creating a <c>Thread</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateThreadRequest(
    Guid AuthorId,
    string Title,
    string Body,
    string Visibility
);
