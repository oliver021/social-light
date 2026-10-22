using Microsoft.Extensions.Logging;

namespace SocialLight.Groups.API.Application;

/// <summary>
/// Application service for <c>Group</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port, publishing the module's integration events on state change.
/// </summary>
public class GroupService(
    IGroupRepository repository,
    IEventBus eventBus,
    ILogger<GroupService> logger)
{
    public Task<Group?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Group>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Group> CreateAsync(
        string name,
        string? description,
        string? avatar,
        string? coverImage,
        string privacyType,
        bool approvalRequired,
        CancellationToken cancellationToken = default)
    {
        var group = new Group(
            name,
            description,
            avatar,
            coverImage,
            privacyType,
            approvalRequired
        );

        await repository.AddAsync(group, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Group), group.Id);
        await eventBus.PublishAsync(new GroupCreated());
        return group;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
