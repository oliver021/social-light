using Microsoft.Extensions.Logging;

namespace SocialLight.Organizations.API.Application;

/// <summary>
/// Application service for <c>Organization</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port, publishing the module's integration events on state change.
/// </summary>
public class OrganizationService(
    IOrganizationRepository repository,
    IEventBus eventBus,
    ILogger<OrganizationService> logger)
{
    public Task<Organization?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<Organization>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<Organization> CreateAsync(
        Guid ownerId,
        string name,
        string? description,
        string? logo,
        string verificationStatus,
        CancellationToken cancellationToken = default)
    {
        var organization = new Organization(
            ownerId,
            name,
            description,
            logo,
            verificationStatus
        );

        await repository.AddAsync(organization, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(Organization), organization.Id);
        await eventBus.PublishAsync(new OrganizationCreated());
        return organization;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
