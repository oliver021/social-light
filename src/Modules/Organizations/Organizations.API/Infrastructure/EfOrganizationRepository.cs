using Microsoft.Extensions.Logging;

namespace SocialLight.Organizations.API.Infrastructure;

/// <summary>
/// EF Core adapter for <see cref="IOrganizationRepository"/> (DESIGN-STRATEGY.md §4):
/// a generic, swappable implementation the module never names directly. For this
/// CRUD-shaped entity the repository owns its own SaveChanges; a rich domain opts
/// into a unit-of-work instead (ceremony proportional to complexity, §1).
/// </summary>
public class EfOrganizationRepository(
    OrganizationsDbContext context,
    ILogger<EfOrganizationRepository> logger) : IOrganizationRepository
{
    public async Task<Organization> AddAsync(Organization organization, CancellationToken cancellationToken = default)
    {
        context.Organizations.Add(organization);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Added {Entity} {Id}", nameof(Organization), organization.Id);
        return organization;
    }

    public Task<Organization?> GetAsync(Guid id, CancellationToken cancellationToken = default)
        => context.Organizations.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, cancellationToken);

    public async Task<IReadOnlyList<Organization>> ListAsync(CancellationToken cancellationToken = default)
        => await context.Organizations.AsNoTracking().ToListAsync(cancellationToken);

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default)
    {
        var organization = await context.Organizations.FindAsync([id], cancellationToken);
        if (organization is null)
        {
            return false;
        }

        context.Organizations.Remove(organization);
        await context.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Deleted {Entity} {Id}", nameof(Organization), id);
        return true;
    }
}
