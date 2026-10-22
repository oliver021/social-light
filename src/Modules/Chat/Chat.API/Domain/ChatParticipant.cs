namespace SocialLight.Chat.Domain;

/// <summary>
/// <c>ChatParticipant</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class ChatParticipant
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ChatId { get; private set; }
    public Guid UserId { get; private set; }
    public string Role { get; private set; } = default!;

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected ChatParticipant() { }

    public ChatParticipant(
        Guid chatId,
        Guid userId,
        string role
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(role);
        ChatId = chatId;
        UserId = userId;
        Role = role;
    }
}
