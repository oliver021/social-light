using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;
using Microsoft.IdentityModel.JsonWebTokens;

namespace SocialLight.AdminPortal.UI;

/// <summary>
/// Seed (category-2): the admin auth boundary. The portal is a privileged client —
/// it signs admins in via OIDC against Identity and requests the admin scope. This
/// is the one place to finish the BFF story: token injection on the /api forwarders
/// (cookie → bearer) is the Phase-4 follow-up; until then forwarded calls rely on the
/// pass-through Authorization header. Own this file.
/// </summary>
public static class AdminAuthExtensions
{
    public static void AddAdminAuthentication(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;
        var configuration = builder.Configuration;

        // Keep the raw "sub" claim (don't map to the long ClaimTypes URI).
        JsonWebTokenHandler.DefaultInboundClaimTypeMap.Remove("sub");

        services.AddAuthorization();

        var auth = services.AddAuthentication(options =>
        {
            options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
        })
        .AddCookie();

        // The AppHost injects Identity__Url like every module. When present, wire OIDC.
        var identityUrl = configuration["Identity:Url"];
        if (!string.IsNullOrWhiteSpace(identityUrl))
        {
            auth.AddOpenIdConnect(options =>
            {
                options.SignInScheme = CookieAuthenticationDefaults.AuthenticationScheme;
                options.Authority = identityUrl;
                options.ClientId = "adminportal";
                options.ClientSecret = "secret";
                options.ResponseType = "code";
                options.SaveTokens = true;
                options.GetClaimsFromUserInfoEndpoint = true;
                options.RequireHttpsMetadata = false;
                options.SignedOutRedirectUri = configuration["CallBackUrl"] ?? "/";
                options.Scope.Add("openid");
                options.Scope.Add("profile");
                options.Scope.Add("offline_access");
                options.Scope.Add("socialapi");
                // The privileged scope the modules will gate admin operations on.
                options.Scope.Add("admin");
            });
        }
    }
}
