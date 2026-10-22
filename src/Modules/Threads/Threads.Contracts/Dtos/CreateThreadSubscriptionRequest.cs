namespace SocialLight.Threads.Contracts;

/// <summary>
/// Write DTO for creating a <c>ThreadSubscription</c>. The key is assigned by the
/// domain/server, so it is intentionally absent from the request body.
/// </summary>
public record CreateThreadSubscriptionRequest(
    Guid ThreadId,
    Guid UserId
);
