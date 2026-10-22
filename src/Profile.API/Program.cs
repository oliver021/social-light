// Profile.API host bootstrap — hand-written service on the generated rails. Thin
// Program (CLAUDE.md §4.2): the host owns the bindings (DB, JWT auth), the service
// owns the behavior. Reaches users only by opaque id (the JWT sub).
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// Binding: JWT bearer auth against Identity (config-driven; host injects Identity__*).
builder.AddDefaultAuthentication();

// Binding: the host wires the concrete Postgres database for the "profile" schema.
builder.AddNpgsqlDbContext<ProfileDbContext>("profiledb");

builder.Services.AddProfileServices();

// Binding: subscribe to UserRegistered so a profile shell is pre-created on signup.
builder.AddRabbitMqEventBus("eventbus")
    .AddProfileSubscriptions();

builder.Services.AddProblemDetails();

var withApiVersioning = builder.Services.AddApiVersioning(options =>
{
    options.ReportApiVersions = true;
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.DefaultApiVersion = new ApiVersion(1, 0);
});

builder.AddDefaultOpenApi(withApiVersioning);

var app = builder.Build();

app.MapDefaultEndpoints();
app.UseStatusCodePages();

app.UseAuthentication();
app.UseAuthorization();

app.MapProfileEndpoints();

app.UseDefaultOpenApi();

app.Run();

// Public so future functional tests can boot the host in-process.
public partial class Program;
