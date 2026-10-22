namespace SocialLight.Chat.Domain;

/// <summary>
/// <c>ChatMute</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class ChatMute
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ChatId { get; private set; }
    public Guid UserId { get; private set; }
    public DateTime? MutedUntil { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected ChatMute() { }

    public ChatMute(
        Guid chatId,
        Guid userId,
        DateTime? mutedUntil
    )
    {
        ChatId = chatId;
        UserId = userId;
        MutedUntil = mutedUntil;
    }
}
