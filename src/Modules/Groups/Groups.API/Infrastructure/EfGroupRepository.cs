using Microsoft.Extensions.Logging;

namespace SocialLight.Groups.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IGroupRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfGroupRepository(
    GroupsDbContext context,
    ILogger<EfGroupRepository> logger) : IGroupRepository
{
    public async Task<Group> AddAsync(Group group, CancellationToken cancellationToken = default)
    {
        context.Groups.Add(group);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Group), group.Id);
        return group;
    }

    public Task<Group?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Groups.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Group>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Groups.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var group = await context.Groups.FindAsync([id], cancellationToken);
        if (group is null)
        {
            return false;
        }

        context.Groups.Remove(group);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Group), id);
        return true;
    }
}
