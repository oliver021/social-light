using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace SocialLight.Recommendation.API.Infrastructure;

/// <summary>
/// Creates the module's schema on startup via EnsureCreated. Runs in
/// <see cref="StartAsync"/> so it completes before the host serves traffic — and
/// before the functional-test WebApplicationFactory hands out an HttpClient.
/// Per-module EF migrations are the intended successor (DESIGN-STRATEGY.md §10);
/// EnsureCreated is the deterministic v1 step that needs no migration snapshot.
/// </summary>
public sealed class RecommendationDbInitializer(
    IServiceProvider serviceProvider,
    ILogger<RecommendationDbInitializer> logger) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<RecommendationDbContext>();

        logger.LogInformation("Ensuring schema for {DbContext}", nameof(RecommendationDbContext));
        await context.Database.EnsureCreatedAsync(cancellationToken);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
