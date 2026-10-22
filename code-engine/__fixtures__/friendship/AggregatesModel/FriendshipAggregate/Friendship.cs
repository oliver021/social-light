using socialLight.Social.Domain.SeedWork;

namespace socialLight.Social.Domain.AggregatesModel.FriendshipAggregate;

/// <summary>
/// Friendship aggregate root. Business rules live here, not in handlers (CLAUDE.md §4.3).
/// </summary>
public class Friendship : Entity, IAggregateRoot
{
    public Guid RequesterId { get; private set; }
    public Guid AddresseeId { get; private set; }
    public string Status { get; private set; } = default!;
    public DateTime CreatedAt { get; private set; }

    protected Friendship() { }

    public Friendship(
        Guid requesterId,
        Guid addresseeId,
        string status,
        DateTime createdAt
    )
    {
        RequesterId = requesterId;
        AddresseeId = addresseeId;
        Status = status;
        CreatedAt = createdAt;
        AddDomainEvent(new FriendshipRequestedDomainEvent(this));
    }
}
