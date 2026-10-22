using System.Net.Http.Json;
using SocialLight.Reels.Contracts;

namespace SocialLight.Reels.Client;

/// <summary>
/// Typed client for the "Reels" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class ReelsClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Reel</c> items.</summary>
    public async Task<IReadOnlyList<ReelDto>> GetReelsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ReelDto>>(
            "/api/reels?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Reel</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ReelDto?> GetReelAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ReelDto>(
            $"/api/reels/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Reel</c> and returns the created resource.</summary>
    public async Task<ReelDto?> CreateReelAsync(CreateReelRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/reels?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ReelDto>(cancellationToken);
    }

    /// <summary>Lists all <c>ReelView</c> items.</summary>
    public async Task<IReadOnlyList<ReelViewDto>> GetReelViewsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ReelViewDto>>(
            "/api/reel-views?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>ReelView</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ReelViewDto?> GetReelViewAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ReelViewDto>(
            $"/api/reel-views/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>ReelView</c> and returns the created resource.</summary>
    public async Task<ReelViewDto?> CreateReelViewAsync(CreateReelViewRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/reel-views?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ReelViewDto>(cancellationToken);
    }

}
