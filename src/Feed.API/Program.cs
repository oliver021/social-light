// Feed.API host bootstrap — hand-written composition service (no database). It
// reaches the generated modules only through their typed clients, and Profile via a
// small client, forwarding the caller's bearer token on each hop.
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();
builder.AddDefaultAuthentication();
builder.Services.AddHttpContextAccessor();

// Relays the caller's JWT to every downstream module (which all RequireAuthorization).
builder.Services.AddTransient<TokenForwardingHandler>();

// Typed clients to the modules + Profile. Base addresses are Aspire service-discovery
// names (resolved from the WithReference(...) wiring in the AppHost).
builder.Services.AddHttpClient<SocialGraphClient>(c => c.BaseAddress = new("http://socialgraph-api"))
    .AddHttpMessageHandler<TokenForwardingHandler>();
builder.Services.AddHttpClient<PostsClient>(c => c.BaseAddress = new("http://posts-api"))
    .AddHttpMessageHandler<TokenForwardingHandler>();
builder.Services.AddHttpClient<EngagementClient>(c => c.BaseAddress = new("http://engagement-api"))
    .AddHttpMessageHandler<TokenForwardingHandler>();
builder.Services.AddHttpClient<ProfileClient>(c => c.BaseAddress = new("http://profile-api"))
    .AddHttpMessageHandler<TokenForwardingHandler>();

builder.Services.AddScoped<FeedService>();

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

app.MapFeedEndpoints();

app.UseDefaultOpenApi();

app.Run();

// Public so future functional tests can boot the host in-process.
public partial class Program;
