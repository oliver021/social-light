namespace SocialLight.Jobs.Contracts;

/// <summary>
/// Write DTO for creating a <c>JobCategory</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateJobCategoryRequest(
    string Name
);
