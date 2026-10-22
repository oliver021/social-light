namespace SocialLight.Chat.Contracts;

/// <summary>
/// Write DTO for creating a <c>MessageReadReceipt</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateMessageReadReceiptRequest(
    Guid MessageId,
    Guid UserId,
    DateTime ReadAt
);
