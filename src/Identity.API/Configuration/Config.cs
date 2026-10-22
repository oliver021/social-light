namespace SocialLight.Identity.API.Configuration
{
    /// <summary>
    /// OIDC configuration for socialLight. The eShop e-commerce clients/scopes were
    /// removed (Phase 0): a single <c>socialapi</c> scope guards every social module
    /// API (modules don't validate audience, so one scope is enough), and the clients
    /// are the social web app, the native MAUI app, the YARP BFF, and a
    /// resource-owner-password client used only by the automated acceptance test.
    /// </summary>
    public class Config
    {
        public const string SocialApiScope = "socialapi";
        // Privileged scope the admin portal requests and (later) modules gate admin
        // operations on. Kept separate from socialapi so a normal user token can never
        // reach admin surfaces.
        public const string AdminScope = "admin";

        public static IEnumerable<ApiResource> GetApis()
        {
            return new List<ApiResource>
            {
                new ApiResource(SocialApiScope, "socialLight API")
                {
                    Scopes = { SocialApiScope, AdminScope }
                },
            };
        }

        public static IEnumerable<ApiScope> GetApiScopes()
        {
            return new List<ApiScope>
            {
                new ApiScope(SocialApiScope, "socialLight API"),
                new ApiScope(AdminScope, "socialLight Admin"),
            };
        }

        public static IEnumerable<IdentityResource> GetResources()
        {
            return new List<IdentityResource>
            {
                new IdentityResources.OpenId(),
                new IdentityResources.Profile()
            };
        }

        public static IEnumerable<Client> GetClients(IConfiguration configuration)
        {
            // Public client base URLs are injected by the host (AppHost). Fall back to
            // localhost so IdentityServer's startup client validation never sees a null
            // redirect uri before those apps exist.
            var webClient = configuration["WebClient"] ?? "https://localhost:7100";
            var mauiCallback = configuration["MauiCallback"] ?? "sociallight://callback";
            var bffClient = configuration["BffClient"] ?? "https://localhost:7200";
            var adminPortalClient = configuration["AdminPortalClient"] ?? "http://localhost:5380";

            var socialScopes = new List<string>
            {
                IdentityServerConstants.StandardScopes.OpenId,
                IdentityServerConstants.StandardScopes.Profile,
                IdentityServerConstants.StandardScopes.OfflineAccess,
                SocialApiScope,
            };

            return new List<Client>
            {
                // Browser SPA / Blazor web client (Authorization Code + PKCE).
                new Client
                {
                    ClientId = "social-web",
                    ClientName = "socialLight Web",
                    AllowedGrantTypes = GrantTypes.Code,
                    RequirePkce = true,
                    RequireClientSecret = false,
                    RequireConsent = false,
                    AllowOfflineAccess = true,
                    AlwaysIncludeUserClaimsInIdToken = true,
                    RedirectUris = { $"{webClient}/signin-oidc" },
                    PostLogoutRedirectUris = { $"{webClient}/signout-callback-oidc" },
                    AllowedScopes = socialScopes,
                    AccessTokenLifetime = 60 * 60 * 2,
                },
                // Native MAUI client (Authorization Code + PKCE, custom-scheme callback).
                new Client
                {
                    ClientId = "social-maui",
                    ClientName = "socialLight Mobile",
                    AllowedGrantTypes = GrantTypes.Code,
                    RequirePkce = true,
                    RequireClientSecret = false,
                    RequireConsent = false,
                    AllowOfflineAccess = true,
                    AllowAccessTokensViaBrowser = true,
                    AlwaysIncludeUserClaimsInIdToken = true,
                    RedirectUris = { mauiCallback },
                    PostLogoutRedirectUris = { $"{mauiCallback}/logout" },
                    AllowedScopes = socialScopes,
                    AccessTokenLifetime = 60 * 60 * 2,
                },
                // Backend-for-frontend (server-side web session; Phase 4 YARP gateway).
                new Client
                {
                    ClientId = "social-bff",
                    ClientName = "socialLight BFF",
                    ClientSecrets = { new Secret("secret".Sha256()) },
                    AllowedGrantTypes = GrantTypes.Code,
                    RequirePkce = true,
                    RequireConsent = false,
                    AllowOfflineAccess = true,
                    AlwaysIncludeUserClaimsInIdToken = true,
                    RedirectUris = { $"{bffClient}/signin-oidc" },
                    PostLogoutRedirectUris = { $"{bffClient}/signout-callback-oidc" },
                    AllowedScopes = socialScopes,
                    AccessTokenLifetime = 60 * 60 * 2,
                },
                // Admin portal (hosted-WASM host-as-BFF): confidential server-side client.
                // Requests the privileged admin scope on top of socialapi.
                new Client
                {
                    ClientId = "adminportal",
                    ClientName = "socialLight Admin Portal",
                    ClientSecrets = { new Secret("secret".Sha256()) },
                    AllowedGrantTypes = GrantTypes.Code,
                    RequirePkce = true,
                    RequireConsent = false,
                    AllowOfflineAccess = true,
                    AlwaysIncludeUserClaimsInIdToken = true,
                    RedirectUris = { $"{adminPortalClient}/signin-oidc" },
                    PostLogoutRedirectUris = { $"{adminPortalClient}/signout-callback-oidc" },
                    AllowedScopes = new List<string>(socialScopes) { AdminScope },
                    AccessTokenLifetime = 60 * 60 * 2,
                },
                // Resource-owner-password client — headless logins for the automated
                // acceptance test (project-acceptance-gate). Not for interactive apps.
                new Client
                {
                    ClientId = "social-tests",
                    ClientName = "socialLight Acceptance Tests",
                    ClientSecrets = { new Secret("secret".Sha256()) },
                    AllowedGrantTypes = GrantTypes.ResourceOwnerPassword,
                    AllowOfflineAccess = true,
                    AllowedScopes = socialScopes,
                    AccessTokenLifetime = 60 * 60,
                },
            };
        }
    }
}
