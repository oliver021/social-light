using System.Net.Http.Json;
using SocialLight.Stories.Contracts;

namespace SocialLight.Stories.Client;

/// <summary>
/// Typed client for the "Stories" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class StoriesClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Story</c> items.</summary>
    public async Task<IReadOnlyList<StoryDto>> GetStoriesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<StoryDto>>(
            "/api/stories?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Story</c> by id, or <c>null</c> if absent.</summary>
    public async Task<StoryDto?> GetStoryAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<StoryDto>(
            $"/api/stories/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Story</c> and returns the created resource.</summary>
    public async Task<StoryDto?> CreateStoryAsync(CreateStoryRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/stories?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<StoryDto>(cancellationToken);
    }

    /// <summary>Lists all <c>StoryView</c> items.</summary>
    public async Task<IReadOnlyList<StoryViewDto>> GetStoryViewsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<StoryViewDto>>(
            "/api/story-views?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>StoryView</c> by id, or <c>null</c> if absent.</summary>
    public async Task<StoryViewDto?> GetStoryViewAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<StoryViewDto>(
            $"/api/story-views/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>StoryView</c> and returns the created resource.</summary>
    public async Task<StoryViewDto?> CreateStoryViewAsync(CreateStoryViewRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/story-views?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<StoryViewDto>(cancellationToken);
    }

    /// <summary>Lists all <c>StoryReply</c> items.</summary>
    public async Task<IReadOnlyList<StoryReplyDto>> GetStoryRepliesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<StoryReplyDto>>(
            "/api/story-replies?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>StoryReply</c> by id, or <c>null</c> if absent.</summary>
    public async Task<StoryReplyDto?> GetStoryReplyAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<StoryReplyDto>(
            $"/api/story-replies/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>StoryReply</c> and returns the created resource.</summary>
    public async Task<StoryReplyDto?> CreateStoryReplyAsync(CreateStoryReplyRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/story-replies?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<StoryReplyDto>(cancellationToken);
    }

}
