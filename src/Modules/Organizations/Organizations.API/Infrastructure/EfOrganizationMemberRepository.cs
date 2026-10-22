using Microsoft.Extensions.Logging;

namespace SocialLight.Organizations.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IOrganizationMemberRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfOrganizationMemberRepository(
    OrganizationsDbContext context,
    ILogger<EfOrganizationMemberRepository> logger) : IOrganizationMemberRepository
{
    public async Task<OrganizationMember> AddAsync(OrganizationMember organizationMember, CancellationToken cancellationToken = default)
    {
        context.OrganizationMembers.Add(organizationMember);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(OrganizationMember), organizationMember.Id);
        return organizationMember;
    }

    public Task<OrganizationMember?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.OrganizationMembers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<OrganizationMember>> ListAsync(CancellationToken cancellationToken = default)
        => await context.OrganizationMembers.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var organizationMember = await context.OrganizationMembers.FindAsync([id], cancellationToken);
        if (organizationMember is null)
        {
            return false;
        }

        context.OrganizationMembers.Remove(organizationMember);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(OrganizationMember), id);
        return true;
    }
}
