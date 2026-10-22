using System.Security.Claims;
using System.Text.Encodings.Web;
using Aspire.Hosting;
using Aspire.Hosting.ApplicationModel;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Events.FunctionalTests;

/// <summary>
/// Boots Events.API in-process (WebApplicationFactory&lt;Program&gt;) against a
/// real Postgres container provisioned by Aspire, and swaps the RabbitMQ event-bus
/// binding for an in-memory <see cref="CapturingEventBus"/>. This is the host's
/// job (DESIGN-STRATEGY.md §4): the module is untouched — only the bindings change.
/// </summary>
public sealed class EventsApiFixture : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly IHost _app;

    public IResourceBuilder<PostgresServerResource> Postgres { get; }
    private string _postgresConnectionString = string.Empty;

    public EventsApiFixture()
    {
        var options = new DistributedApplicationOptions
        {
            AssemblyName = typeof(EventsApiFixture).Assembly.FullName,
            DisableDashboard = true,
        };
        var appBuilder = DistributedApplication.CreateBuilder(options);

        // Resource name == the connection name the API reads (AddNpgsqlDbContext("eventsdb")).
        Postgres = appBuilder.AddPostgres("eventsdb")
            .WithImage("ankane/pgvector")
            .WithImageTag("latest");
        _app = appBuilder.Build();
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        // Inject the container connection string as the module's DB binding.
        builder.ConfigureHostConfiguration(config =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                [$"ConnectionStrings:{Postgres.Resource.Name}"] = _postgresConnectionString,
            });
        });

        // Swap the broker binding (DESIGN-STRATEGY.md §4) for an in-memory bus.
        builder.ConfigureServices(services =>
        {
            // Drop the RabbitMQ IEventBus and the hosted service that starts it
            // (registered via a factory that casts IEventBus -> RabbitMQEventBus).
            services.RemoveAll<IEventBus>();
            foreach (var descriptor in services
                .Where(d => d.ServiceType == typeof(IHostedService) && d.ImplementationFactory is not null)
                .ToList())
            {
                services.Remove(descriptor);
            }

            services.AddSingleton<CapturingEventBus>();
            services.AddSingleton<IEventBus>(sp => sp.GetRequiredService<CapturingEventBus>());

            // The module's endpoints RequireAuthorization, but the real JWT binding
            // is off in tests (no "Identity" config). Swap in a test scheme that
            // always authenticates a fixed user, so endpoints run and owner fields
            // bind to TestAuthHandler.UserId from the "sub" claim (DESIGN-STRATEGY §4).
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

/// <summary>
/// Test authentication scheme: every request is authenticated as a fixed user, so
/// endpoints behind <c>RequireAuthorization</c> run and owner fields bind to
/// <see cref="UserId"/> via the "sub" claim — no Identity server needed in tests.
/// </summary>
public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";

    /// <summary>The stable "sub" the test caller authenticates as.</summary>
    public static readonly Guid UserId = Guid.Parse("11111111-1111-1111-1111-111111111111");

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
