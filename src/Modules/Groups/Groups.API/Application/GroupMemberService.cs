using Microsoft.Extensions.Logging;

namespace SocialLight.Groups.API.Application;

/// <summary>
/// Application service for <c>GroupMember</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class GroupMemberService(
    IGroupMemberRepository repository,
    ILogger<GroupMemberService> logger)
{
    public Task<GroupMember?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<GroupMember>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<GroupMember> CreateAsync(
        Guid groupId,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var groupMember = new GroupMember(
            groupId,
            userId,
            role
        );

        await repository.AddAsync(groupMember, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(GroupMember), groupMember.Id);
        return groupMember;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
