using Microsoft.Extensions.Logging;

namespace SocialLight.Pages.API.Application;

/// <summary>
/// Application service for <c>PageRole</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class PageRoleService(
    IPageRoleRepository repository,
    ILogger<PageRoleService> logger)
{
    public Task<PageRole?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<PageRole>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<PageRole> CreateAsync(
        Guid pageId,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var pageRole = new PageRole(
            pageId,
            userId,
            role
        );

        await repository.AddAsync(pageRole, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(PageRole), pageRole.Id);
        return pageRole;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
