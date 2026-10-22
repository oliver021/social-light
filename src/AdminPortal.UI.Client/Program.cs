using Microsoft.AspNetCore.Components.Web;
using Microsoft.AspNetCore.Components.WebAssembly.Hosting;
using MudBlazor.Services;

var builder = WebAssemblyHostBuilder.CreateDefault(args);
builder.RootComponents.Add<App>("#app");
builder.RootComponents.Add<HeadOutlet>("head::after");

builder.Services.AddMudServices();

// Same-origin: the host serves this WASM and proxies /api/* to the modules, so every
// typed client points at the host origin. One registration per module spec (fan-in).
// In the browser HttpClient wraps fetch, so a plain instance per client is the norm.
builder.Services.AddScoped(_ => new ChatClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new EngagementClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new EventsClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new GamingClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new GroupsClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new JobsClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new ModerationClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new NotificationsClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new OrganizationsClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new PagesClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new PostsClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new RecommendationClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new ReelsClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new SocialGraphClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new StoriesClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));
builder.Services.AddScoped(_ => new ThreadsClient(new HttpClient { BaseAddress = new Uri(builder.HostEnvironment.BaseAddress) }));

// Realtime: SignalR client to the host's hub (broker-driven, no polling).
builder.Services.AddSingleton<AdminHubClient>();

await builder.Build().RunAsync();
