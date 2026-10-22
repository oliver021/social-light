// Groups.API host bootstrap. Kept thin (CLAUDE.md §4.2): DI wiring lives in
// GroupsModuleExtensions, endpoints in Api/. The host owns the BINDINGS
// (DESIGN-STRATEGY.md §4): which database, which broker. The module only exposes
// ports via AddGroupsModule(), so it never sees Npgsql or a connection string.
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Binding: JWT bearer auth against the Identity authority. Config-driven
// (ServiceDefaults reads the "Identity" section); a no-op until the host injects
// Identity__Url/Identity__Audience, so functional tests swap in a test scheme.
builder.AddDefaultAuthentication();

// Binding: the host wires the concrete Postgres database for this module's schema.
builder.AddNpgsqlDbContext<GroupsDbContext>("groupsdb");

// Ports: the module registers its repositories + application services + schema init.
builder.Services.AddGroupsModule();

builder.Services.AddProblemDetails();

var withApiVersioning = builder.Services.AddApiVersioning(options =>
{
    // Emit api-supported-versions / api-deprecated-versions headers on every response.
    options.ReportApiVersions = true;
    // Default to v1 when the caller omits api-version (e.g. requests proxied through
    // the gateway), so a single public origin works without per-call version params.
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.DefaultApiVersion = new ApiVersion(1, 0);
});

builder.AddDefaultOpenApi(withApiVersioning);

// Binding: the integration-event transport. Swapped for an in-memory bus in
// functional tests (DESIGN-STRATEGY.md §4) without touching the module.
builder.AddRabbitMqEventBus("eventbus")
    .AddSubscription<UserDeleted, UserDeletedHandler>();

var app = builder.Build();

app.MapDefaultEndpoints();
app.UseStatusCodePages();

app.UseAuthentication();
app.UseAuthorization();

app.MapGroupsApi();

app.UseDefaultOpenApi();

app.Run();

// Exposed as public so the functional tests' WebApplicationFactory<Program> can
// boot the real host in-process (CLAUDE.md §5, eShop Program.Testing.cs pattern).
public partial class Program;
