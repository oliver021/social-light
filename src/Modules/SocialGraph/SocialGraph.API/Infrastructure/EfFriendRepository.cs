using Microsoft.Extensions.Logging;

namespace SocialLight.SocialGraph.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IFriendRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfFriendRepository(
    SocialGraphDbContext context,
    ILogger<EfFriendRepository> logger) : IFriendRepository
{
    public async Task<Friend> AddAsync(Friend friend, CancellationToken cancellationToken = default)
    {
        context.Friends.Add(friend);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Friend), friend.Id);
        return friend;
    }

    public Task<Friend?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Friends.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Friend>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Friends.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var friend = await context.Friends.FindAsync([id], cancellationToken);
        if (friend is null)
        {
            return false;
        }

        context.Friends.Remove(friend);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Friend), id);
        return true;
    }
}
