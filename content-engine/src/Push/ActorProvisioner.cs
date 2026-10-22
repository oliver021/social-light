using System.Net.Http.Json;
using System.Text.Json;
using SocialLight.ContentEngine.Infrastructure;
using SocialLight.ContentEngine.Model;

namespace SocialLight.ContentEngine.Push;

/// <summary>
/// Turns a synthetic actor into an authenticated principal: register (idempotent)
/// then obtain an access token via the resource-owner-password grant.
///
/// NOTE (v0): these are the conventional Identity endpoints — they depend on the
/// Phase-0 Identity wiring landing. Until then, push records a provisioning error
/// per actor and continues, so the rest of the pipeline stays exercisable.
/// </summary>
public sealed class ActorProvisioner(HttpClient identity)
{
    public async Task<(string UserId, string Token)> EnsureAsync(SeedActor actor, CancellationToken ct)
    {
        await RegisterAsync(actor, ct);
        return await LoginAsync(actor, ct);
    }

    private async Task RegisterAsync(SeedActor actor, CancellationToken ct)
    {
        using var resp = await identity.PostAsJsonAsync("/api/account/register", new
        {
            email = actor.Credential.Email,
            password = actor.Credential.Password,
            displayName = actor.DisplayName,
        }, Json.Options, ct);

        // 409/Conflict == already registered (idempotent re-runs); anything else
        // that's neither success nor conflict is a real failure.
        if (!resp.IsSuccessStatusCode && (int)resp.StatusCode != 409)
        {
            var detail = await resp.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"register {(int)resp.StatusCode}: {detail}");
        }
    }

    private async Task<(string UserId, string Token)> LoginAsync(SeedActor actor, CancellationToken ct)
    {
        var form = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["grant_type"] = "password",
            ["username"] = actor.Credential.Email,
            ["password"] = actor.Credential.Password,
            ["scope"] = "openid profile socialapi",
            ["client_id"] = "social-tests",
            ["client_secret"] = "secret",
        });

        using var resp = await identity.PostAsync("/connect/token", form, ct);
        if (!resp.IsSuccessStatusCode)
        {
            var detail = await resp.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException($"token {(int)resp.StatusCode}: {detail}");
        }

        var payload = await resp.Content.ReadFromJsonAsync<JsonElement>(Json.Options, ct);
        var token = payload.TryGetProperty("access_token", out var t) ? t.GetString() : null;
        if (string.IsNullOrEmpty(token))
            throw new InvalidOperationException("token response had no access_token");

        var userId = ReadSubject(token) ?? actor.Ref;
        return (userId, token);
    }

    /// <summary>Best-effort read of the <c>sub</c> claim from a JWT payload.</summary>
    private static string? ReadSubject(string jwt)
    {
        var parts = jwt.Split('.');
        if (parts.Length < 2) return null;

        try
        {
            var payload = parts[1].Replace('-', '+').Replace('_', '/');
            payload = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');
            using var doc = JsonDocument.Parse(Convert.FromBase64String(payload));
            return doc.RootElement.TryGetProperty("sub", out var sub) ? sub.GetString() : null;
        }
        catch (Exception ex) when (ex is FormatException or JsonException)
        {
            return null;
        }
    }
}
