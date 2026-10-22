using System.Security.Claims;
using System.Text.Encodings.Web;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SocialLight.EventBus.Abstractions;
using SocialLight.EventBus.Events;

namespace Profile.FunctionalTests;

/// <summary>
/// Boots Profile.API in-process against a real Postgres container (Aspire), and
/// swaps in a test auth scheme (the API's endpoints RequireAuthorization, but the
/// real JWT binding is off without an "Identity" config section). Every request is
/// authenticated as <see cref="TestAuthHandler.UserId"/> — the profile owner.
/// The RabbitMQ event-bus binding is replaced by an in-memory capturing bus so
/// the tests don't need a broker (DESIGN-STRATEGY.md §4 — only bindings change).
/// </summary>
public sealed class ProfileApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly IHost _app;

    public IResourceBuilder<PostgresServerResource> Postgres { get; }
    private string _postgresConnectionString = string.Empty;

    public ProfileApiFixture()
    {
        var options = new DistributedApplicationOptions
        {
            AssemblyName = typeof(ProfileApiFixture).Assembly.FullName,
            DisableDashboard = true,
        };
        var appBuilder = DistributedApplication.CreateBuilder(options);

        // Resource name == the connection name the API reads (AddNpgsqlDbContext("profiledb")).
        Postgres = appBuilder.AddPostgres("profiledb")
            .WithImage("ankane/pgvector")
            .WithImageTag("latest");
        _app = appBuilder.Build();
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        builder.ConfigureHostConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                [$"ConnectionStrings:{Postgres.Resource.Name}"] = _postgresConnectionString,
            });
        });

        builder.ConfigureServices(services =>
        {
            // Swap the RabbitMQ bus for an in-memory stub (no broker needed in tests).
            services.RemoveAll<IEventBus>();
            foreach (var descriptor in services
                .Where(d => d.ServiceType == typeof(IHostedService) && d.ImplementationFactory is not null)
                .ToList())
            {
                services.Remove(descriptor);
            }
            services.AddSingleton<IEventBus, CapturingEventBus>();

            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });
            services.AddAuthorization();
        });

        return base.CreateHost(builder);
    }

    public async ValueTask InitializeAsync()
    {
        await _app.StartAsync();
        _postgresConnectionString = await Postgres.Resource.GetConnectionStringAsync()
            ?? throw new InvalidOperationException("Could not resolve the Postgres connection string.");
    }

    public new async Task DisposeAsync()
    {
        await base.DisposeAsync();
        await _app.StopAsync();
        if (_app is IAsyncDisposable asyncDisposable)
        {
            await asyncDisposable.DisposeAsync();
        }
        else
        {
            _app.Dispose();
        }
    }
}

/// <summary>In-memory event bus for Profile functional tests — no broker needed.</summary>
public sealed class CapturingEventBus : IEventBus
{
    public Task PublishAsync(IntegrationEvent @event) => Task.CompletedTask;
}

public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";
    public static readonly Guid UserId = Guid.Parse("22222222-2222-2222-2222-222222222222");

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim("sub", UserId.ToString()),
            new Claim(ClaimTypes.Name, "test-user"),
        };
        var identity = new ClaimsIdentity(claims, SchemeName);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
