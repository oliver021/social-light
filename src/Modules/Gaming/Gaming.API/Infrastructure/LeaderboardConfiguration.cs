namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>EF Core mapping for <c>Leaderboard</c> (applied by the module DbContext).</summary>
public class LeaderboardConfiguration : IEntityTypeConfiguration<Leaderboard>
{
    public void Configure(EntityTypeBuilder<Leaderboard> builder)
    {
        builder.HasKey(x => x.Id);
    }
}
