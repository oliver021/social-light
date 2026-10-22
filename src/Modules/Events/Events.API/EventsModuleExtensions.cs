namespace SocialLight.Events.API;

/// <summary>
/// The single line the host needs to adopt this module (DESIGN-STRATEGY.md §4):
/// it registers the module's PORTS (repositories), application services, and
/// schema initializer. It deliberately does NOT bind the database or the broker —
/// those are the host's job — so the module never sees a connection string.
/// </summary>
public static class EventsModuleExtensions
{
    public static IServiceCollection AddEventsModule(this IServiceCollection services)
    {
        // Ports → adapters (dependency inversion; the adapter is swappable).
        services.AddScoped<IEventRepository, EfEventRepository>();
        services.AddScoped<IEventAttendanceRepository, EfEventAttendanceRepository>();

        // Application services.
        services.AddScoped<EventService>();
        services.AddScoped<EventAttendanceService>();

        // Schema initialization (EnsureCreated; per-module EF migrations are the
        // intended successor — DESIGN-STRATEGY.md §10).
        services.AddHostedService<EventsDbInitializer>();

        return services;
    }
}
