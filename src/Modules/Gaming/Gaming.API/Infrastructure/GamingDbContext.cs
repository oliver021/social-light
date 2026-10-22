namespace SocialLight.Gaming.API.Infrastructure;

/// <summary>
/// DbContext for the "Gaming" module — owns the "gaming" schema only
/// (DESIGN-STRATEGY.md §4). No cross-module foreign keys, JOINs, or queries:
/// anything outside this module is reached via publishes/consumes, never here.
/// Entity configuration lives in the per-entity IEntityTypeConfiguration classes,
/// applied below.
/// </summary>
public class GamingDbContext(DbContextOptions<GamingDbContext> options) : DbContext(options)
{
    public DbSet<Game> Games => Set<Game>();
    public DbSet<PlayerProfile> PlayerProfiles => Set<PlayerProfile>();
    public DbSet<Achievement> Achievements => Set<Achievement>();
    public DbSet<UserAchievement> UserAchievements => Set<UserAchievement>();
    public DbSet<Tournament> Tournaments => Set<Tournament>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<Match> Matches => Set<Match>();
    public DbSet<Leaderboard> Leaderboards => Set<Leaderboard>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        builder.HasDefaultSchema("gaming");
        builder.ApplyConfigurationsFromAssembly(typeof(GamingDbContext).Assembly);
        base.OnModelCreating(builder);
    }
}
