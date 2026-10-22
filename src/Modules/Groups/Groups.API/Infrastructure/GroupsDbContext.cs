namespace SocialLight.Groups.API.Infrastructure;

/// <summary>
/// DbContext for the "Groups" module — owns the "groups" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class GroupsDbContext(DbContextOptions<GroupsDbContext> options) : DbContext(options)
{
    public DbSet<Group> Groups => Set<Group>();
    public DbSet<GroupMember> GroupMembers => Set<GroupMember>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("groups");
        builder.ApplyConfigurationsFromAssembly(typeof(GroupsDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
