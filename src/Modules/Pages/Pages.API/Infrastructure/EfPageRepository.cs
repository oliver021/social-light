using Microsoft.Extensions.Logging;

namespace SocialLight.Pages.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IPageRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfPageRepository(
    PagesDbContext context,
    ILogger<EfPageRepository> logger) : IPageRepository
{
    public async Task<Page> AddAsync(Page page, CancellationToken cancellationToken = default)
    {
        context.Pages.Add(page);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Page), page.Id);
        return page;
    }

    public Task<Page?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Pages.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Page>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Pages.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var page = await context.Pages.FindAsync([id], cancellationToken);
        if (page is null)
        {
            return false;
        }

        context.Pages.Remove(page);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Page), id);
        return true;
    }
}
