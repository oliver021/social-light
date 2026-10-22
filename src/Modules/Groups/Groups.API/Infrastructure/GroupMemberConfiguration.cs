namespace SocialLight.Groups.API.Infrastructure;

/// <summary>EF Core mapping for <c>GroupMember</c> (applied by the module DbContext).</summary>
public class GroupMemberConfiguration : IEntityTypeConfiguration<GroupMember>
{
    public void Configure(EntityTypeBuilder<GroupMember> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Role).IsRequired();
    }
}
