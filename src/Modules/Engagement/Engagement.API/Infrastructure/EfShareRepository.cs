using Microsoft.Extensions.Logging;

namespace SocialLight.Engagement.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IShareRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfShareRepository(
    EngagementDbContext context,
    ILogger<EfShareRepository> logger) : IShareRepository
{
    public async Task<Share> AddAsync(Share share, CancellationToken cancellationToken = default)
    {
        context.Shares.Add(share);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Share), share.Id);
        return share;
    }

    public Task<Share?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Shares.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Share>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Shares.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var share = await context.Shares.FindAsync([id], cancellationToken);
        if (share is null)
        {
            return false;
        }

        context.Shares.Remove(share);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Share), id);
        return true;
    }
}
