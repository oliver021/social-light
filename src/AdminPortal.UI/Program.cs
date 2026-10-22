// AdminPortal.UI host (host-as-BFF). The aggregate scope generated the per-module
// proxy routes and broker subscriptions below from every module spec; auth + the
// hub body are seeds you own.
var builder = WebApplication.CreateBuilder(args);

builder.AddServiceDefaults();

// OIDC login for admins (cookie session) — see AdminAuthExtensions (seed).
builder.AddAdminAuthentication();

// Reverse proxy to the modules with Aspire service discovery (resolves http://<svc>).
builder.Services.AddHttpForwarderWithServiceDiscovery();

// Realtime over the broker (no polling): subscribe to every module's published
// events and relay them to the SignalR hub. Generated from all module specs.
builder.Services.AddSignalR();
builder.AddAdminEventRelay();

var app = builder.Build();

app.MapDefaultEndpoints();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error", createScopeForErrors: true);
    app.UseHsts();
}

// Serve the WASM client.
app.UseBlazorFrameworkFiles();
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// BFF login surface: the WASM navigates (full load) to /login; the cookie session is
// then exchanged onto every forwarded call as a bearer token (InjectToken below).
app.MapGet("/login", (string? returnUrl) =>
    Results.Challenge(new AuthenticationProperties { RedirectUri = returnUrl ?? "/" },
        [OpenIdConnectDefaults.AuthenticationScheme]));

app.MapGet("/logout", () =>
    Results.SignOut(new AuthenticationProperties { RedirectUri = "/" },
        [CookieAuthenticationDefaults.AuthenticationScheme, OpenIdConnectDefaults.AuthenticationScheme]));

app.MapGet("/user", (HttpContext ctx) =>
    ctx.User.Identity?.IsAuthenticated == true
        ? Results.Ok(new { name = ctx.User.Identity!.Name ?? ctx.User.FindFirst("name")?.Value ?? "admin" })
        : Results.Unauthorized());

// Stamps the admin's access token (saved on the OIDC cookie) onto every /api request
// before the forwarders run; YARP copies the Authorization header downstream, so the
// modules — which all RequireAuthorization — accept the BFF hop.
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        var token = await context.GetTokenAsync("access_token");
        if (!string.IsNullOrEmpty(token))
        {
            context.Request.Headers.Authorization = $"Bearer {token}";
        }
    }
    await next();
});

// BFF: forward each module's entity routes to its service. The browser calls these
// same-origin (one public host), so there is no CORS and the token stays here.
// One MapForwarder per entity across all modules (fan-in).
app.MapForwarder("/api/chats/{**catch-all}", "http://chat-api").RequireAuthorization();
app.MapForwarder("/api/chat-participants/{**catch-all}", "http://chat-api").RequireAuthorization();
app.MapForwarder("/api/messages/{**catch-all}", "http://chat-api").RequireAuthorization();
app.MapForwarder("/api/message-reactions/{**catch-all}", "http://chat-api").RequireAuthorization();
app.MapForwarder("/api/message-read-receipts/{**catch-all}", "http://chat-api").RequireAuthorization();
app.MapForwarder("/api/message-attachments/{**catch-all}", "http://chat-api").RequireAuthorization();
app.MapForwarder("/api/chat-blocks/{**catch-all}", "http://chat-api").RequireAuthorization();
app.MapForwarder("/api/chat-requests/{**catch-all}", "http://chat-api").RequireAuthorization();
app.MapForwarder("/api/chat-mutes/{**catch-all}", "http://chat-api").RequireAuthorization();
app.MapForwarder("/api/chat-pins/{**catch-all}", "http://chat-api").RequireAuthorization();
app.MapForwarder("/api/reactions/{**catch-all}", "http://engagement-api").RequireAuthorization();
app.MapForwarder("/api/comments/{**catch-all}", "http://engagement-api").RequireAuthorization();
app.MapForwarder("/api/shares/{**catch-all}", "http://engagement-api").RequireAuthorization();
app.MapForwarder("/api/events/{**catch-all}", "http://events-api").RequireAuthorization();
app.MapForwarder("/api/event-attendances/{**catch-all}", "http://events-api").RequireAuthorization();
app.MapForwarder("/api/games/{**catch-all}", "http://gaming-api").RequireAuthorization();
app.MapForwarder("/api/player-profiles/{**catch-all}", "http://gaming-api").RequireAuthorization();
app.MapForwarder("/api/achievements/{**catch-all}", "http://gaming-api").RequireAuthorization();
app.MapForwarder("/api/user-achievements/{**catch-all}", "http://gaming-api").RequireAuthorization();
app.MapForwarder("/api/tournaments/{**catch-all}", "http://gaming-api").RequireAuthorization();
app.MapForwarder("/api/teams/{**catch-all}", "http://gaming-api").RequireAuthorization();
app.MapForwarder("/api/team-members/{**catch-all}", "http://gaming-api").RequireAuthorization();
app.MapForwarder("/api/matches/{**catch-all}", "http://gaming-api").RequireAuthorization();
app.MapForwarder("/api/leaderboards/{**catch-all}", "http://gaming-api").RequireAuthorization();
app.MapForwarder("/api/groups/{**catch-all}", "http://groups-api").RequireAuthorization();
app.MapForwarder("/api/group-members/{**catch-all}", "http://groups-api").RequireAuthorization();
app.MapForwarder("/api/job-categories/{**catch-all}", "http://jobs-api").RequireAuthorization();
app.MapForwarder("/api/job-positions/{**catch-all}", "http://jobs-api").RequireAuthorization();
app.MapForwarder("/api/job-applications/{**catch-all}", "http://jobs-api").RequireAuthorization();
app.MapForwarder("/api/reports/{**catch-all}", "http://moderation-api").RequireAuthorization();
app.MapForwarder("/api/moderation-cases/{**catch-all}", "http://moderation-api").RequireAuthorization();
app.MapForwarder("/api/moderation-actions/{**catch-all}", "http://moderation-api").RequireAuthorization();
app.MapForwarder("/api/moderation-notes/{**catch-all}", "http://moderation-api").RequireAuthorization();
app.MapForwarder("/api/appeals/{**catch-all}", "http://moderation-api").RequireAuthorization();
app.MapForwarder("/api/notifications/{**catch-all}", "http://notifications-api").RequireAuthorization();
app.MapForwarder("/api/organizations/{**catch-all}", "http://organizations-api").RequireAuthorization();
app.MapForwarder("/api/organization-members/{**catch-all}", "http://organizations-api").RequireAuthorization();
app.MapForwarder("/api/pages/{**catch-all}", "http://pages-api").RequireAuthorization();
app.MapForwarder("/api/page-roles/{**catch-all}", "http://pages-api").RequireAuthorization();
app.MapForwarder("/api/posts/{**catch-all}", "http://posts-api").RequireAuthorization();
app.MapForwarder("/api/post-medias/{**catch-all}", "http://posts-api").RequireAuthorization();
app.MapForwarder("/api/post-feeds/{**catch-all}", "http://posts-api").RequireAuthorization();
app.MapForwarder("/api/user-interests/{**catch-all}", "http://recommendation-api").RequireAuthorization();
app.MapForwarder("/api/content-scores/{**catch-all}", "http://recommendation-api").RequireAuthorization();
app.MapForwarder("/api/feed-rankings/{**catch-all}", "http://recommendation-api").RequireAuthorization();
app.MapForwarder("/api/recommendation-candidates/{**catch-all}", "http://recommendation-api").RequireAuthorization();
app.MapForwarder("/api/trending-topics/{**catch-all}", "http://recommendation-api").RequireAuthorization();
app.MapForwarder("/api/hashtags/{**catch-all}", "http://recommendation-api").RequireAuthorization();
app.MapForwarder("/api/topics/{**catch-all}", "http://recommendation-api").RequireAuthorization();
app.MapForwarder("/api/reels/{**catch-all}", "http://reels-api").RequireAuthorization();
app.MapForwarder("/api/reel-views/{**catch-all}", "http://reels-api").RequireAuthorization();
app.MapForwarder("/api/follows/{**catch-all}", "http://socialgraph-api").RequireAuthorization();
app.MapForwarder("/api/friends/{**catch-all}", "http://socialgraph-api").RequireAuthorization();
app.MapForwarder("/api/blocks/{**catch-all}", "http://socialgraph-api").RequireAuthorization();
app.MapForwarder("/api/user-preferences/{**catch-all}", "http://socialgraph-api").RequireAuthorization();
app.MapForwarder("/api/stories/{**catch-all}", "http://stories-api").RequireAuthorization();
app.MapForwarder("/api/story-views/{**catch-all}", "http://stories-api").RequireAuthorization();
app.MapForwarder("/api/story-replies/{**catch-all}", "http://stories-api").RequireAuthorization();
app.MapForwarder("/api/threads/{**catch-all}", "http://threads-api").RequireAuthorization();
app.MapForwarder("/api/thread-replies/{**catch-all}", "http://threads-api").RequireAuthorization();
app.MapForwarder("/api/thread-subscriptions/{**catch-all}", "http://threads-api").RequireAuthorization();

// Realtime hub the WASM client connects to.
app.MapHub<AdminEventHub>("/hubs/admin-events").RequireAuthorization();

// Everything else is the WASM SPA.
app.MapFallbackToFile("index.html");

app.Run();
