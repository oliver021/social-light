namespace SocialLight.Chat.Domain;

/// <summary>
/// <c>Chat</c> — single canonical module form (DESIGN-STRATEGY.md §1):
/// ceremony is proportional to domain complexity, the shape is invariant.
/// Properties have private setters; state changes go through the constructor (and,
/// for a rich domain, through behavior methods that raise domain events).
/// </summary>
public class Chat
{
    public Guid Id { get; private set; } = Guid.NewGuid();
    public string Type { get; private set; } = default!;
    public string? Title { get; private set; }
    public Guid CreatedBy { get; private set; }
    public ICollection<ChatParticipant> ChatParticipants { get; private set; } = [];
    public ICollection<Message> Messages { get; private set; } = [];

    /// <summary>Parameterless constructor required by EF Core materialization.</summary>
    protected Chat() { }

    public Chat(
        string type,
        string? title,
        Guid createdBy
    )
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(type);
        Type = type;
        Title = title;
        CreatedBy = createdBy;
    }
}
