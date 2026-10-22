using System.Net;
using System.Net.Http.Json;

namespace SocialLight.Feed.API.Clients;

/// <summary>
/// Tiny typed client for the hand-written Profile service. Profile has no shared
/// client package yet, so Feed keeps its own loose view model (decoupled from
/// Profile's internals) and reads just what the feed needs.
/// </summary>
public sealed class ProfileClient(HttpClient httpClient)
{
    public async Task<ProfileSummary?> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.GetAsync($"/api/profiles/{userId}?api-version=1.0", cancellationToken);
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ProfileSummary>(cancellationToken);
    }
}

/// <summary>Feed's own view of a profile — only the fields it renders.</summary>
public record ProfileSummary(Guid UserId, string DisplayName, string? AvatarUrl);
