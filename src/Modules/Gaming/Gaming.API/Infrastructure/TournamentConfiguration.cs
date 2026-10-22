namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>EF Core mapping for <c>Tournament</c> (applied by the module DbContext).</summary>
public class TournamentConfiguration : IEntityTypeConfiguration<Tournament>
{
    public void Configure(EntityTypeBuilder<Tournament> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
