using Microsoft.AspNetCore.Authentication.JwtBearer;

namespace SocialLight.Chat.API.Realtime;

/// <summary>
/// Realtime wiring for the Chat module: registers SignalR and makes the JWT
/// bearer scheme WebSocket-friendly. This is generated, immutable plumbing (category
/// 1) — the novel behavior lives in <c>ChatHub</c> (a seed you own).
/// </summary>
public static class ChatRealtimeExtensions
{
    public static IServiceCollection AddChatRealtime(this IServiceCollection services)
    {
        services.AddSignalR();

        // Browsers cannot set the Authorization header on the WebSocket handshake, so
        // accept the bearer token from the `access_token` query string on hub paths
        // (the standard SignalR pattern). Chained so any existing handler still runs.
        services.Configure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, options =>
        {
            options.Events ??= new JwtBearerEvents();
            var prior = options.Events.OnMessageReceived;
            options.Events.OnMessageReceived = async context =>
            {
                if (prior is not null) await prior(context);

                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs/chat"))
                {
                    context.Token = accessToken;
                }
            };
        });

        return services;
    }
}
