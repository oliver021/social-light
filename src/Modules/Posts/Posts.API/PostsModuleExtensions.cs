namespace SocialLight.Posts.API;

/// <summary>
/// The single line the host needs to adopt this module (DESIGN-STRATEGY.md §4):
/// it registers the module's PORTS (repositories), application services, and
/// schema initializer. It deliberately does NOT bind the database or the broker —
/// those are the host's job — so the module never sees a connection string.
/// </summary>
public static class PostsModuleExtensions
{
    public static IServiceCollection AddPostsModule(this IServiceCollection services)
    {
        // Ports → adapters (dependency inversion; the adapter is swappable).
        services.AddScoped<IPostRepository, EfPostRepository>();
        services.AddScoped<IPostMediaRepository, EfPostMediaRepository>();
        services.AddScoped<IPostFeedRepository, EfPostFeedRepository>();

        // Application services.
        services.AddScoped<PostService>();
        services.AddScoped<PostMediaService>();
        services.AddScoped<PostFeedService>();

        // Schema initialization (EnsureCreated; per-module EF migrations are the
        // intended successor — DESIGN-STRATEGY.md §10).
        services.AddHostedService<PostsDbInitializer>();

        return services;
    }
}
