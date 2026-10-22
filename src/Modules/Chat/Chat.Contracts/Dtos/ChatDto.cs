namespace SocialLight.Chat.Contracts;

/// <summary>
/// Read DTO for <c>Chat</c> — the wire shape returned by the API and
/// consumed by every typed client (DESIGN-STRATEGY.md §5). Decoupled from the
/// domain aggregate so persistence concerns never leak across the boundary.
/// </summary>
public record ChatDto(
    Guid Id,
    string Type,
    string? Title,
    Guid CreatedBy
);
