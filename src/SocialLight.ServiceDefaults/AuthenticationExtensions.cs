using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.IdentityModel.JsonWebTokens;

namespace SocialLight.ServiceDefaults;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddDefaultAuthentication(this IHostApplicationBuilder builder)
    {
        var services = builder.Services;
        var configuration = builder.Configuration;

        // {
        //   "Identity": {
        //     "Url": "http://identity",
        //     "Audience": "basket"
        //    }
        // }

        var identitySection = configuration.GetSection("Identity");

        if (!identitySection.Exists())
        {
            // No identity section, so no authentication
            return services;
        }

        // prevent from mapping "sub" claim to nameidentifier.
        JsonWebTokenHandler.DefaultInboundClaimTypeMap.Remove("sub");

        services.AddAuthentication().AddJwtBearer(options =>
        {
            var identityUrl = identitySection.GetRequiredValue("Url");
            var audience = identitySection.GetRequiredValue("Audience");

            options.Authority = identityUrl;
            options.RequireHttpsMetadata = false;
            options.Audience = audience;
            
#if DEBUG
            //Needed if using Android Emulator Locally. See https://learn.microsoft.com/en-us/dotnet/maui/data-cloud/local-web-services?view=net-maui-8.0#android
            options.TokenValidationParameters.ValidIssuers = [identityUrl, "https://10.0.2.2:5243"];
#else
            options.TokenValidationParameters.ValidIssuers = [identityUrl];
#endif
            
            options.TokenValidationParameters.ValidateAudience = false;
            // Under Aspire/dev the authority is reached on different hosts by
            // different callers (e.g. localhost vs host.docker.internal), so the
            // token's `iss` host can't be pinned reliably. The signature is still
            // validated against the authority's keys; production should pin the
            // issuer (stable IssuerUri behind the gateway) and re-enable this.
            options.TokenValidationParameters.ValidateIssuer = false;
        });

        services.AddAuthorization();

        return services;
    }
}
