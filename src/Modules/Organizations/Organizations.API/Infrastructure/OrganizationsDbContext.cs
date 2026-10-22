namespace SocialLight.Organizations.API.Infrastructure;

/// <summary>
/// DbContext for the "Organizations" module — owns the "organizations" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class OrganizationsDbContext(DbContextOptions<OrganizationsDbContext> options) : DbContext(options)
{
    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<OrganizationMember> OrganizationMembers => Set<OrganizationMember>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("organizations");
        builder.ApplyConfigurationsFromAssembly(typeof(OrganizationsDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
