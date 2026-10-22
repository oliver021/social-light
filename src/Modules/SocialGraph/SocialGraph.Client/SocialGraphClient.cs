using System.Net.Http.Json;
using SocialLight.SocialGraph.Contracts;

namespace SocialLight.SocialGraph.Client;

/// <summary>
/// Typed client for the "SocialGraph" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class SocialGraphClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Follow</c> items.</summary>
    public async Task<IReadOnlyList<FollowDto>> GetFollowsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<FollowDto>>(
            "/api/follows?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Follow</c> by id, or <c>null</c> if absent.</summary>
    public async Task<FollowDto?> GetFollowAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<FollowDto>(
            $"/api/follows/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Follow</c> and returns the created resource.</summary>
    public async Task<FollowDto?> CreateFollowAsync(CreateFollowRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/follows?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<FollowDto>(cancellationToken);
    }

    /// <summary>Lists all <c>Friend</c> items.</summary>
    public async Task<IReadOnlyList<FriendDto>> GetFriendsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<FriendDto>>(
            "/api/friends?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Friend</c> by id, or <c>null</c> if absent.</summary>
    public async Task<FriendDto?> GetFriendAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<FriendDto>(
            $"/api/friends/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Friend</c> and returns the created resource.</summary>
    public async Task<FriendDto?> CreateFriendAsync(CreateFriendRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/friends?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<FriendDto>(cancellationToken);
    }

    /// <summary>Lists all <c>Block</c> items.</summary>
    public async Task<IReadOnlyList<BlockDto>> GetBlocksAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<BlockDto>>(
            "/api/blocks?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Block</c> by id, or <c>null</c> if absent.</summary>
    public async Task<BlockDto?> GetBlockAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<BlockDto>(
            $"/api/blocks/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Block</c> and returns the created resource.</summary>
    public async Task<BlockDto?> CreateBlockAsync(CreateBlockRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/blocks?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<BlockDto>(cancellationToken);
    }

    /// <summary>Lists all <c>UserPreference</c> items.</summary>
    public async Task<IReadOnlyList<UserPreferenceDto>> GetUserPreferencesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<UserPreferenceDto>>(
            "/api/user-preferences?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>UserPreference</c> by id, or <c>null</c> if absent.</summary>
    public async Task<UserPreferenceDto?> GetUserPreferenceAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<UserPreferenceDto>(
            $"/api/user-preferences/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>UserPreference</c> and returns the created resource.</summary>
    public async Task<UserPreferenceDto?> CreateUserPreferenceAsync(CreateUserPreferenceRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/user-preferences?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<UserPreferenceDto>(cancellationToken);
    }

}
