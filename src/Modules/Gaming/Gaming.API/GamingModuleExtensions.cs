namespace SocialLight.Gaming.API;

/// <summary>
/// The single line the host needs to adopt this module (DESIGN-STRATEGY.md §4):
/// it registers the module's PORTS (repositories), application services, and
/// schema initializer. It deliberately does NOT bind the database or the broker —
/// those are the host's job — so the module never sees a connection string.
/// </summary>
public static class GamingModuleExtensions
{
    public static IServiceCollection AddGamingModule(this IServiceCollection services)
    {
        // Ports → adapters (dependency inversion; the adapter is swappable).
        services.AddScoped<IGameRepository, EfGameRepository>();
        services.AddScoped<IPlayerProfileRepository, EfPlayerProfileRepository>();
        services.AddScoped<IAchievementRepository, EfAchievementRepository>();
        services.AddScoped<IUserAchievementRepository, EfUserAchievementRepository>();
        services.AddScoped<ITournamentRepository, EfTournamentRepository>();
        services.AddScoped<ITeamRepository, EfTeamRepository>();
        services.AddScoped<ITeamMemberRepository, EfTeamMemberRepository>();
        services.AddScoped<IMatchRepository, EfMatchRepository>();
        services.AddScoped<ILeaderboardRepository, EfLeaderboardRepository>();

        // Application services.
        services.AddScoped<GameService>();
        services.AddScoped<PlayerProfileService>();
        services.AddScoped<AchievementService>();
        services.AddScoped<UserAchievementService>();
        services.AddScoped<TournamentService>();
        services.AddScoped<TeamService>();
        services.AddScoped<TeamMemberService>();
        services.AddScoped<MatchService>();
        services.AddScoped<LeaderboardService>();

        // Schema initialization (EnsureCreated; per-module EF migrations are the
        // intended successor — DESIGN-STRATEGY.md §10).
        services.AddHostedService<GamingDbInitializer>();

        return services;
    }
}
