using Microsoft.Extensions.Logging;

namespace SocialLight.Pages.API.Application;

/// <summary>
/// Application service for <c>Page</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port, publishing the module's integration events on state change.
/// </summary>
public class PageService(
    IPageRepository repository,
    IEventBus eventBus,
    ILogger<PageService> logger)
{
    public Task<Page?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Page>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Page> CreateAsync(
        string name,
        string category,
        string? description,
        string? avatar,
        string? coverImage,
        string verificationStatus,
        CancellationToken cancellationToken = default)
    {
        var page = new Page(
            name,
            category,
            description,
            avatar,
            coverImage,
            verificationStatus
        );

        await repository.AddAsync(page, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Page), page.Id);
        await eventBus.PublishAsync(new PageCreated());
        return page;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
