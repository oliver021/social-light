using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace SocialLight.Profile.API.Infrastructure;

/// <summary>
/// Creates the "profile" schema on startup via EnsureCreated (same v1 approach as
/// the generated modules; per-module EF migrations are the intended successor).
/// </summary>
public sealed class ProfileDbInitializer(
    IServiceProvider serviceProvider,
    ILogger<ProfileDbInitializer> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ProfileDbContext>();

        logger.LogInformation("Ensuring schema for {DbContext}", nameof(ProfileDbContext));
        await context.Database.EnsureCreatedAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
