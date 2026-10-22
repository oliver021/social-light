using Aspire.Hosting.ApplicationModel;
using Aspire.Hosting.Yarp;

var builder = DistributedApplication.CreateBuilder(args);

// Publish target: `aspire publish` / `dotnet run -- --publisher docker-compose` emits a
// docker-compose.yml where services resolve each other by name on one network.
builder.AddDockerComposeEnvironment("compose");

// Shared infrastructure for the social modules.
var rabbitMq = builder.AddRabbitMQ("eventbus")
    .WithLifetime(ContainerLifetime.Persistent);
var postgres = builder.AddPostgres("postgres")
    .WithImage("ankane/pgvector")
    .WithImageTag("latest")
    .WithLifetime(ContainerLifetime.Persistent);
// Redis backs the marketplace Basket (eShop-style ephemeral cart state).
var redis = builder.AddRedis("redis");

// Identity — the social authority (Duende IdentityServer + ASP.NET Core Identity).
// It issues the JWTs every module validates, and owns its own identitydb.
var identityDb = postgres.AddDatabase("identitydb");
var identityApi = builder.AddProject<Projects.Identity_API>("identity-api", "http")
    .WithExternalHttpEndpoints()
    // Reference (connection string) but do NOT WaitFor the database resource: the
    // app creates its database on startup (migrations/EnsureCreated), while the db
    // resource's health check only passes once that database exists — WaitFor(db)
    // here is a startup deadlock. The server (postgres) WaitFor still applies.
    .WithReference(identityDb)
    // Publish UserRegistered/UserDeleted events via the bus.
    .WithReference(rabbitMq).WaitFor(rabbitMq)
    .WithHttpHealthCheck("/health", endpointName: "http");
var identityEndpoint = identityApi.GetEndpoint("http");

// The host owns the BINDINGS (DESIGN-STRATEGY.md §4): for each generated module,
// its Postgres schema + the broker + the JWT auth binding. ServiceDefaults'
// AddDefaultAuthentication reads Identity__Url/__Audience; injecting them here turns
// on real token validation (off by default, so functional tests use a test scheme).
IResourceBuilder<ProjectResource> Module(
    IResourceBuilder<ProjectResource> module,
    IResourceBuilder<PostgresDatabaseResource> db) =>
    module
        .WithReference(rabbitMq).WaitFor(rabbitMq)
        // WithReference (connection string) but NOT WaitFor the database resource —
        // the module creates its db on startup, so waiting for the db's health check
        // (which needs the db to already exist) would deadlock startup.
        .WithReference(db)
        .WithEnvironment("Identity__Url", identityEndpoint)
        .WithEnvironment("Identity__Audience", "socialapi")
        // OpenAPI OAuth metadata (ServiceDefaults requires Identity:Scopes when the
        // Identity section is present): scope name -> description.
        .WithEnvironment("Identity__Scopes__socialapi", "socialLight API")
        .WaitFor(identityApi)
        .WithHttpHealthCheck("/health", endpointName: "http");

// social-graph — Follow / Friend / Block / UserPreference.
var socialGraph = Module(builder.AddProject<Projects.SocialGraph_API>("socialgraph-api"), postgres.AddDatabase("socialGraphdb"));
// posts — Post / PostMedia / PostFeed.
var posts = Module(builder.AddProject<Projects.Posts_API>("posts-api"), postgres.AddDatabase("postsdb"));
// engagement — Reaction / Comment / Share (polymorphic by targetType+targetId).
var engagement = Module(builder.AddProject<Projects.Engagement_API>("engagement-api"), postgres.AddDatabase("engagementdb"));
// stories — Story / StoryView / StoryReply.
var stories = Module(builder.AddProject<Projects.Stories_API>("stories-api"), postgres.AddDatabase("storiesdb"));
// groups — Group / GroupMember.
var groups = Module(builder.AddProject<Projects.Groups_API>("groups-api"), postgres.AddDatabase("groupsdb"));
// events — Event / EventAttendance.
var events = Module(builder.AddProject<Projects.Events_API>("events-api"), postgres.AddDatabase("eventsdb"));
// reels — Reel / ReelView.
var reels = Module(builder.AddProject<Projects.Reels_API>("reels-api"), postgres.AddDatabase("reelsdb"));
// organizations — Organization / OrganizationMember.
var organizations = Module(builder.AddProject<Projects.Organizations_API>("organizations-api"), postgres.AddDatabase("organizationsdb"));
// chat — Chat / ChatParticipant / Message / MessageReaction / … .
var chat = Module(builder.AddProject<Projects.Chat_API>("chat-api"), postgres.AddDatabase("chatdb"));
// notifications — Notification (fan-in; consumes events from many modules).
var notifications = Module(builder.AddProject<Projects.Notifications_API>("notifications-api"), postgres.AddDatabase("notificationsdb"));
// gaming — Game / PlayerProfile / Achievement / Tournament / Match / Leaderboard / … .
var gaming = Module(builder.AddProject<Projects.Gaming_API>("gaming-api"), postgres.AddDatabase("gamingdb"));
// jobs — JobCategory / JobPosition / JobApplication.
var jobs = Module(builder.AddProject<Projects.Jobs_API>("jobs-api"), postgres.AddDatabase("jobsdb"));
// moderation — Report / ModerationCase / ModerationAction / ModerationNote / Appeal.
var moderation = Module(builder.AddProject<Projects.Moderation_API>("moderation-api"), postgres.AddDatabase("moderationdb"));
// pages — Page / PageRole.
var pages = Module(builder.AddProject<Projects.Pages_API>("pages-api"), postgres.AddDatabase("pagesdb"));
// recommendation — UserInterest / … (pgvector-backed recommendations).
var recommendation = Module(builder.AddProject<Projects.Recommendation_API>("recommendation-api"), postgres.AddDatabase("recommendationdb"));
// threads — Thread / ThreadPost / … (entity `Thread` is global::-qualified by the engine).
var threads = Module(builder.AddProject<Projects.Threads_API>("threads-api"), postgres.AddDatabase("threadsdb"));

// ── Marketplace module (the eShop store, REUSED not generated) ──────────────
// Rich pre-existing DDD/CQRS domain (Ordering) + read-heavy CRUD (Catalog) +
// Redis cart (Basket). They authenticate through the SAME ServiceDefaults
// AddDefaultAuthentication every social module uses, so the Module() binding's
// Identity__Audience=socialapi injection makes them validate social JWTs as-is;
// a social user's `sub` IS the marketplace buyer id (one Identity authority).
//
// catalog — read-heavy product catalog (Catalog-altitude CRUD + pgvector search).
var catalog = Module(builder.AddProject<Projects.Catalog_API>("catalog-api"), postgres.AddDatabase("catalogdb"));
// ordering — rich DDD aggregate + CQRS + transactional outbox (Ordering-altitude).
var orderingDb = postgres.AddDatabase("orderingdb");
var ordering = Module(builder.AddProject<Projects.Ordering_API>("ordering-api"), orderingDb);
// basket — Redis-backed ephemeral cart, gRPC + integration events. Not a Module()
// (no Postgres schema); wired by hand with the same Identity audience binding.
var basket = builder.AddProject<Projects.Basket_API>("basket-api")
    .WithReference(redis)
    .WithReference(rabbitMq).WaitFor(rabbitMq)
    .WithEnvironment("Identity__Url", identityEndpoint)
    .WithEnvironment("Identity__Audience", "socialapi")
    .WithEnvironment("Identity__Scopes__socialapi", "socialLight API")
    .WaitFor(identityApi);
redis.WithParentRelationship(basket);
// Background workers consuming the order/payment integration events off the bus.
builder.AddProject<Projects.OrderProcessor>("order-processor")
    .WithReference(rabbitMq).WaitFor(rabbitMq)
    .WithReference(orderingDb)
    .WaitFor(ordering); // ordering-api owns the EF migrations; wait for it
builder.AddProject<Projects.PaymentProcessor>("payment-processor")
    .WithReference(rabbitMq).WaitFor(rabbitMq);

// profile — hand-written social profile (Phase 2), keyed by the Identity sub.
var profile = Module(builder.AddProject<Projects.Profile_API>("profile-api"), postgres.AddDatabase("profiledb"));

// feed — hand-written composition service (Phase 3), no DB. Reaches the modules via
// their typed clients (service discovery from these references) and forwards the JWT.
var feed = builder.AddProject<Projects.Feed_API>("feed-api")
    .WithReference(socialGraph)
    .WithReference(posts)
    .WithReference(engagement)
    .WithReference(profile)
    .WithEnvironment("Identity__Url", identityEndpoint)
    .WithEnvironment("Identity__Audience", "socialapi")
    .WithEnvironment("Identity__Scopes__socialapi", "socialLight API")
    .WaitFor(identityApi)
    .WithHttpHealthCheck("/health", endpointName: "http");

// media-service — store-and-serve media host (MPEG.Service extended). Persists
// content-addressed blobs (POST /api/v1/media) and serves them at /blobs. The
// content-engine seed and the web frontend reference these URLs on social entities
// (Profile.AvatarUrl, PostMedia.fileUrl). No DB, no auth (dev media host behind the
// gateway); not a Module() — it has no Postgres schema and validates no JWTs.
var media = builder.AddProject<Projects.MPEG_Service>("media-service")
    .WithExternalHttpEndpoints()
    .WithHttpHealthCheck("/health", endpointName: "http");

// social-bff (Phase 4) — the single public origin. YARP reverse-proxies one base URL
// to every service and forwards the bearer token (headers pass through by default),
// so a frontend has one host + one login. Adding the remaining modules (stories,
// groups, …) is one AddRoute line each. Full web-BFF OIDC cookie session (Duende.BFF)
// is the follow-up; this MVP gives native + token clients the unified origin.
var gateway = builder.AddYarp("social-bff")
    .WithExternalHttpEndpoints()
    .WithConfiguration(yarp =>
    {
        // Identity — token issuance + JSON signup.
        yarp.AddRoute("/connect/{**catch-all}", identityApi.GetEndpoint("http"));
        yarp.AddRoute("/api/account/{**catch-all}", identityApi.GetEndpoint("http"));

        // Profile (Phase 2).
        yarp.AddRoute("/api/profiles/{**catch-all}", profile.GetEndpoint("http"));

        // Posts module.
        yarp.AddRoute("/api/posts/{**catch-all}", posts.GetEndpoint("http"));
        yarp.AddRoute("/api/post-medias/{**catch-all}", posts.GetEndpoint("http"));
        yarp.AddRoute("/api/post-feeds/{**catch-all}", posts.GetEndpoint("http"));

        // Engagement module (polymorphic).
        yarp.AddRoute("/api/comments/{**catch-all}", engagement.GetEndpoint("http"));
        yarp.AddRoute("/api/reactions/{**catch-all}", engagement.GetEndpoint("http"));
        yarp.AddRoute("/api/shares/{**catch-all}", engagement.GetEndpoint("http"));

        // SocialGraph module.
        yarp.AddRoute("/api/follows/{**catch-all}", socialGraph.GetEndpoint("http"));
        yarp.AddRoute("/api/friends/{**catch-all}", socialGraph.GetEndpoint("http"));
        yarp.AddRoute("/api/blocks/{**catch-all}", socialGraph.GetEndpoint("http"));
        yarp.AddRoute("/api/user-preferences/{**catch-all}", socialGraph.GetEndpoint("http"));

        // Stories module.
        yarp.AddRoute("/api/stories/{**catch-all}", stories.GetEndpoint("http"));
        yarp.AddRoute("/api/story-views/{**catch-all}", stories.GetEndpoint("http"));
        yarp.AddRoute("/api/story-replies/{**catch-all}", stories.GetEndpoint("http"));

        // Groups module.
        yarp.AddRoute("/api/groups/{**catch-all}", groups.GetEndpoint("http"));
        yarp.AddRoute("/api/group-members/{**catch-all}", groups.GetEndpoint("http"));

        // Events module.
        yarp.AddRoute("/api/events/{**catch-all}", events.GetEndpoint("http"));
        yarp.AddRoute("/api/event-attendances/{**catch-all}", events.GetEndpoint("http"));

        // Reels module.
        yarp.AddRoute("/api/reels/{**catch-all}", reels.GetEndpoint("http"));
        yarp.AddRoute("/api/reel-views/{**catch-all}", reels.GetEndpoint("http"));

        // Organizations module.
        yarp.AddRoute("/api/organizations/{**catch-all}", organizations.GetEndpoint("http"));
        yarp.AddRoute("/api/organization-members/{**catch-all}", organizations.GetEndpoint("http"));

        // Chat module.
        yarp.AddRoute("/api/chats/{**catch-all}", chat.GetEndpoint("http"));
        yarp.AddRoute("/api/chat-participants/{**catch-all}", chat.GetEndpoint("http"));
        yarp.AddRoute("/api/chat-blocks/{**catch-all}", chat.GetEndpoint("http"));
        yarp.AddRoute("/api/chat-requests/{**catch-all}", chat.GetEndpoint("http"));
        yarp.AddRoute("/api/chat-mutes/{**catch-all}", chat.GetEndpoint("http"));
        yarp.AddRoute("/api/chat-pins/{**catch-all}", chat.GetEndpoint("http"));
        yarp.AddRoute("/api/messages/{**catch-all}", chat.GetEndpoint("http"));
        yarp.AddRoute("/api/message-reactions/{**catch-all}", chat.GetEndpoint("http"));
        yarp.AddRoute("/api/message-read-receipts/{**catch-all}", chat.GetEndpoint("http"));
        yarp.AddRoute("/api/message-attachments/{**catch-all}", chat.GetEndpoint("http"));
        // Realtime SignalR hub (WebSocket upgrades pass through YARP unchanged).
        yarp.AddRoute("/hubs/chat/{**catch-all}", chat.GetEndpoint("http"));

        // Notifications module.
        yarp.AddRoute("/api/notifications/{**catch-all}", notifications.GetEndpoint("http"));

        // Feed (Phase 3).
        yarp.AddRoute("/api/feed/{**catch-all}", feed.GetEndpoint("http"));

        // Media host — upload (POST /api/v1/media) + static serve (/blobs/**) both
        // route through the one public origin so the browser loads media same-origin.
        yarp.AddRoute("/api/v1/media/{**catch-all}", media.GetEndpoint("http"));
        yarp.AddRoute("/blobs/{**catch-all}", media.GetEndpoint("http"));

        // Marketplace module — Catalog & Ordering are REST and route through the
        // one public origin like any social module. Basket is gRPC: this passthrough
        // serves native/gRPC clients; a browser needs gRPC-web (or a REST shim) —
        // tracked as the frontend-phase follow-up.
        yarp.AddRoute("/api/catalog/{**catch-all}", catalog.GetEndpoint("http"));
        yarp.AddRoute("/api/orders/{**catch-all}", ordering.GetEndpoint("http"));
        yarp.AddRoute("/api/basket/{**catch-all}", basket.GetEndpoint("http"));
    });

// AdminPortal.UI (hosted-WASM, host-as-BFF) — the generated admin portal. The host
// subscribes to the broker for realtime fan-out to admins, reverse-proxies /api/* to
// each module via Aspire service discovery (hence the references below), and signs
// admins in via Identity. Generated by code-engine's aggregate scope from app-specs;
// this is the single hand-wired host line (DESIGN-STRATEGY.md §4).
var adminPortal = builder.AddProject<Projects.AdminPortal_UI>("admin-portal")
    .WithExternalHttpEndpoints()
    .WithReference(rabbitMq).WaitFor(rabbitMq)
    .WithReference(socialGraph)
    .WithReference(posts)
    .WithReference(engagement)
    .WithReference(stories)
    .WithReference(groups)
    .WithReference(events)
    .WithReference(reels)
    .WithReference(organizations)
    .WithReference(chat)
    .WithReference(notifications)
    .WithReference(gaming)
    .WithReference(jobs)
    .WithReference(moderation)
    .WithReference(pages)
    .WithReference(recommendation)
    .WithReference(threads)
    .WithEnvironment("Identity__Url", identityEndpoint)
    .WithEnvironment("Identity__Audience", "socialapi")
    .WithEnvironment("Identity__Scopes__socialapi", "socialLight API")
    .WaitFor(identityApi)
    .WithHttpHealthCheck("/health", endpointName: "http");

// Cross-wire the OIDC pair (eShop callback pattern, resolved at orchestration time):
// Identity learns the portal's redirect origin; the portal learns its own callback.
var adminPortalEndpoint = adminPortal.GetEndpoint("http");
adminPortal.WithEnvironment("CallBackUrl", adminPortalEndpoint);
identityApi.WithEnvironment("AdminPortalClient", adminPortalEndpoint);

// Opt-in fixed gateway port (default behaviour unchanged): set GatewayHttpPort to
// pin social-bff's http endpoint to a known URL, so the TypeScript SDK test
// (clients/typescript) can target SOCIALLIGHT_GATEWAY_URL=http://localhost:<port>.
if (int.TryParse(builder.Configuration["GatewayHttpPort"], out var gatewayPort))
{
    gateway.WithEndpoint("http", e => e.Port = gatewayPort, createIfNotExists: false);
}

// Opt-in fixed admin-portal port (default behaviour unchanged): set AdminPortalHttpPort
// to pin admin-portal's http endpoint to a known URL for smoke tests.
if (int.TryParse(builder.Configuration["AdminPortalHttpPort"], out var adminPortalPort))
{
    adminPortal.WithEndpoint("http", e => e.Port = adminPortalPort, createIfNotExists: false);
}

builder.Build().Run();
