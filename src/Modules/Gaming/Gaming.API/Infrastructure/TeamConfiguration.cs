namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>EF Core mapping for <c>Team</c> (applied by the module DbContext).</summary>
public class TeamConfiguration : IEntityTypeConfiguration<Team>
{
    public void Configure(EntityTypeBuilder<Team> builder)
    {
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Name).IsRequired();
        // Intra-module relation (DESIGN-STRATEGY.md §3): allowed because TeamMember is in this module.
        builder.HasMany(x => x.TeamMembers).WithOne();
    }
}
