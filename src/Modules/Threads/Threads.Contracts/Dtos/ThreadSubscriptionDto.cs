namespace SocialLight.Threads.Contracts;

/// <summary>
/// Read DTO for <c>ThreadSubscription</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record ThreadSubscriptionDto(
    Guid Id,
    Guid ThreadId,
    Guid UserId
);
