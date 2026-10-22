using Microsoft.Extensions.Logging;

namespace SocialLight.SocialGraph.API.Application;

/// <summary>
/// Application service for <c>Friend</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class FriendService(
    IFriendRepository repository,
    ILogger<FriendService> logger)
{
    public Task<Friend?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Friend>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Friend> CreateAsync(
        Guid requesterId,
        Guid recipientId,
        string status,
        DateTime? acceptedAt,
        CancellationToken cancellationToken = default)
    {
        var friend = new Friend(
            requesterId,
            recipientId,
            status,
            acceptedAt
        );

        await repository.AddAsync(friend, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Friend), friend.Id);
        return friend;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
