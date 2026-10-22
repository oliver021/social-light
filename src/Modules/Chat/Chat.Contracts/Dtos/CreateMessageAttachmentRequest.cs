namespace SocialLight.Chat.Contracts;

/// <summary>
/// Write DTO for creating a <c>MessageAttachment</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateMessageAttachmentRequest(
    Guid MessageId,
    string FileUrl,
    string MediaType
);
