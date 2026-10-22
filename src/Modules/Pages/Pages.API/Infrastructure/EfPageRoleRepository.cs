using Microsoft.Extensions.Logging;

namespace SocialLight.Pages.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IPageRoleRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfPageRoleRepository(
    PagesDbContext context,
    ILogger<EfPageRoleRepository> logger) : IPageRoleRepository
{
    public async Task<PageRole> AddAsync(PageRole pageRole, CancellationToken cancellationToken = default)
    {
        context.PageRoles.Add(pageRole);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(PageRole), pageRole.Id);
        return pageRole;
    }

    public Task<PageRole?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.PageRoles.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<PageRole>> ListAsync(CancellationToken cancellationToken = default)
        => await context.PageRoles.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var pageRole = await context.PageRoles.FindAsync([id], cancellationToken);
        if (pageRole is null)
        {
            return false;
        }

        context.PageRoles.Remove(pageRole);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(PageRole), id);
        return true;
    }
}
