namespace SocialLight.Chat.Domain;

/// <summary>
/// <c>ChatBlock</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class ChatBlock
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public Guid ChatId { get; private set; }
    public Guid BlockerId { get; private set; }
    public Guid BlockedId { get; private set; }

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected ChatBlock() { }

    public ChatBlock(
        Guid chatId,
        Guid blockerId,
        Guid blockedId
    )
    {
        ChatId = chatId;
        BlockerId = blockerId;
        BlockedId = blockedId;
    }
}
