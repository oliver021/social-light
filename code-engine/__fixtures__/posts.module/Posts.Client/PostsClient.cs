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

    /// <summary>Lists all <c>Comment</c> items.</summary>
    public async Task<IReadOnlyList<CommentDto>> GetCommentsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<CommentDto>>(
            "/api/comments?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Comment</c> by id, or <c>null</c> if absent.</summary>
    public async Task<CommentDto?> GetCommentAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<CommentDto>(
            $"/api/comments/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Comment</c> and returns the created resource.</summary>
    public async Task<CommentDto?> CreateCommentAsync(CreateCommentRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/comments?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<CommentDto>(cancellationToken);
    }

}
