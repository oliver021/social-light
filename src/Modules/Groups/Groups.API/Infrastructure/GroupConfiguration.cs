namespace SocialLight.Groups.API.Infrastructure;

/// <summary>EF Core mapping for <c>Group</c> (applied by the module DbContext).</summary>
public class GroupConfiguration : IEntityTypeConfiguration<Group>
{
    public void Configure(EntityTypeBuilder<Group> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired();
        builder.Property(x => x.PrivacyType).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because GroupMember is in this module.
        builder.HasMany(x => x.GroupMembers).WithOne();
    }
}
