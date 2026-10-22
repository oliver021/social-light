using System.Net.Http.Json;
using SocialLight.Engagement.Contracts;

namespace SocialLight.Engagement.Client;

/// <summary>
/// Typed client for the "Engagement" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class EngagementClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Reaction</c> items.</summary>
    public async Task<IReadOnlyList<ReactionDto>> GetReactionsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ReactionDto>>(
            "/api/reactions?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Reaction</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ReactionDto?> GetReactionAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ReactionDto>(
            $"/api/reactions/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Reaction</c> and returns the created resource.</summary>
    public async Task<ReactionDto?> CreateReactionAsync(CreateReactionRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/reactions?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ReactionDto>(cancellationToken);
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

    /// <summary>Lists all <c>Share</c> items.</summary>
    public async Task<IReadOnlyList<ShareDto>> GetSharesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ShareDto>>(
            "/api/shares?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Share</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ShareDto?> GetShareAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ShareDto>(
            $"/api/shares/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Share</c> and returns the created resource.</summary>
    public async Task<ShareDto?> CreateShareAsync(CreateShareRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/shares?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ShareDto>(cancellationToken);
    }

}
