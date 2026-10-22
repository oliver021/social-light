using Microsoft.Extensions.Logging;

namespace SocialLight.Organizations.API.Application;

/// <summary>
/// Application service for <c>OrganizationMember</c> — ceremony proportional to domain
/// complexity (DESIGN-STRATEGY.md §1): a thin orchestration over the repository
/// port.
/// </summary>
public class OrganizationMemberService(
    IOrganizationMemberRepository repository,
    ILogger<OrganizationMemberService> logger)
{
    public Task<OrganizationMember?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => repository.GetAsync(id, cancellationToken);

    public Task<IReadOnlyList<OrganizationMember>> ListAsync(CancellationToken cancellationToken = default)
        => repository.ListAsync(cancellationToken);

    public async Task<OrganizationMember> CreateAsync(
        Guid organizationId,
        Guid userId,
        string role,
        CancellationToken cancellationToken = default)
    {
        var organizationMember = new OrganizationMember(
            organizationId,
            userId,
            role
        );

        await repository.AddAsync(organizationMember, cancellationToken);
        logger.LogInformation("Created {Entity} {Id}", nameof(OrganizationMember), organizationMember.Id);
        return organizationMember;
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var deleted = await repository.DeleteAsync(id, cancellationToken);
        return deleted;
    }
}
