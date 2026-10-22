using System.Net.Http.Json;
using SocialLight.Posts.Contracts;

namespace SocialLight.Posts.Client;

/// <summary>
/// Typed client for the "Posts" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class PostsClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Post</c> items.</summary>
    public async Task<IReadOnlyList<PostDto>> GetPostsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<PostDto>>(
            "/api/posts?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Post</c> by id, or <c>null</c> if absent.</summary>
    public async Task<PostDto?> GetPostAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<PostDto>(
            $"/api/posts/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Post</c> and returns the created resource.</summary>
    public async Task<PostDto?> CreatePostAsync(CreatePostRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/posts?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PostDto>(cancellationToken);
    }

    /// <summary>Lists all <c>PostMedia</c> items.</summary>
    public async Task<IReadOnlyList<PostMediaDto>> GetPostMediasAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<PostMediaDto>>(
            "/api/post-medias?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>PostMedia</c> by id, or <c>null</c> if absent.</summary>
    public async Task<PostMediaDto?> GetPostMediaAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<PostMediaDto>(
            $"/api/post-medias/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>PostMedia</c> and returns the created resource.</summary>
    public async Task<PostMediaDto?> CreatePostMediaAsync(CreatePostMediaRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/post-medias?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PostMediaDto>(cancellationToken);
    }

    /// <summary>Lists all <c>PostFeed</c> items.</summary>
    public async Task<IReadOnlyList<PostFeedDto>> GetPostFeedsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<PostFeedDto>>(
            "/api/post-feeds?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>PostFeed</c> by id, or <c>null</c> if absent.</summary>
    public async Task<PostFeedDto?> GetPostFeedAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<PostFeedDto>(
            $"/api/post-feeds/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>PostFeed</c> and returns the created resource.</summary>
    public async Task<PostFeedDto?> CreatePostFeedAsync(CreatePostFeedRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/post-feeds?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PostFeedDto>(cancellationToken);
    }

}
