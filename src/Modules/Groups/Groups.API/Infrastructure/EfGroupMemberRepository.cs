using Microsoft.Extensions.Logging;

namespace SocialLight.Groups.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IGroupMemberRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfGroupMemberRepository(
    GroupsDbContext context,
    ILogger<EfGroupMemberRepository> logger) : IGroupMemberRepository
{
    public async Task<GroupMember> AddAsync(GroupMember groupMember, CancellationToken cancellationToken = default)
    {
        context.GroupMembers.Add(groupMember);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(GroupMember), groupMember.Id);
        return groupMember;
    }

    public Task<GroupMember?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.GroupMembers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<GroupMember>> ListAsync(CancellationToken cancellationToken = default)
        => await context.GroupMembers.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var groupMember = await context.GroupMembers.FindAsync([id], cancellationToken);
        if (groupMember is null)
        {
            return false;
        }

        context.GroupMembers.Remove(groupMember);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(GroupMember), id);
        return true;
    }
}
