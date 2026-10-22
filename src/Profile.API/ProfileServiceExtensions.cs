using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SocialLight.Profile.API.Application;
using SocialLight.Profile.API.IntegrationEvents;

namespace SocialLight.Profile.API;

/// <summary>DI registrations for the Profile service (kept out of Program.cs).</summary>
public static class ProfileServiceExtensions
{
    public static IServiceCollection AddProfileServices(this IServiceCollection services)
    {
        services.AddScoped<ProfileService>();
        services.AddHostedService<ProfileDbInitializer>();
        return services;
    }

    /// <summary>
    /// Subscribe to identity lifecycle events on the event bus builder returned
    /// by <c>builder.AddRabbitMqEventBus()</c>. Split from AddProfileServices so
    /// the functional tests (which swap in an in-memory bus) can call this too.
    /// </summary>
    public static IEventBusBuilder AddProfileSubscriptions(this IEventBusBuilder eventBusBuilder)
    {
        return eventBusBuilder.AddSubscription<UserRegistered, UserRegisteredHandler>();
    }
}
