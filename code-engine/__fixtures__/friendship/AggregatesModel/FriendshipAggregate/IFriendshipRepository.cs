using socialLight.Social.Domain.SeedWork;

namespace socialLight.Social.Domain.AggregatesModel.FriendshipAggregate;

public interface IFriendshipRepository : IRepository<Friendship>
{
    Friendship Add(Friendship friendship);
    void Update(Friendship friendship);
    Task<Friendship?> GetAsync(Guid id);
}
