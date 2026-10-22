namespace SocialLight.SocialGraph.API;

/// <summary>
/// The single line the host needs to adopt this module (DESIGN-STRATEGY.md §4):
/// it registers the module's PORTS (repositories), application services, and
/// schema initializer. It deliberately does NOT bind the database or the broker —
/// those are the host's job — so the module never sees a connection string.
/// </summary>
public static class SocialGraphModuleExtensions
{
    public static IServiceCollection AddSocialGraphModule(this IServiceCollection services)
    {
        // Ports → adapters (dependency inversion; the adapter is swappable).
        services.AddScoped<IFollowRepository, EfFollowRepository>();
        services.AddScoped<IFriendRepository, EfFriendRepository>();
        services.AddScoped<IBlockRepository, EfBlockRepository>();
        services.AddScoped<IUserPreferenceRepository, EfUserPreferenceRepository>();

        // Application services.
        services.AddScoped<FollowService>();
        services.AddScoped<FriendService>();
        services.AddScoped<BlockService>();
        services.AddScoped<UserPreferenceService>();

        // Schema initialization (EnsureCreated; per-module EF migrations are the
        // intended successor — DESIGN-STRATEGY.md §10).
        services.AddHostedService<SocialGraphDbInitializer>();

        return services;
    }
}
