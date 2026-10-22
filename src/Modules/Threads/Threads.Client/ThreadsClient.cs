using System.Net.Http.Json;
using SocialLight.Threads.Contracts;

namespace SocialLight.Threads.Client;

/// <summary>
/// Typed client for the "Threads" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class ThreadsClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Thread</c> items.</summary>
    public async Task<IReadOnlyList<ThreadDto>> GetThreadsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ThreadDto>>(
            "/api/threads?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Thread</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ThreadDto?> GetThreadAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ThreadDto>(
            $"/api/threads/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Thread</c> and returns the created resource.</summary>
    public async Task<ThreadDto?> CreateThreadAsync(CreateThreadRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/threads?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ThreadDto>(cancellationToken);
    }

    /// <summary>Lists all <c>ThreadReply</c> items.</summary>
    public async Task<IReadOnlyList<ThreadReplyDto>> GetThreadRepliesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ThreadReplyDto>>(
            "/api/thread-replies?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>ThreadReply</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ThreadReplyDto?> GetThreadReplyAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ThreadReplyDto>(
            $"/api/thread-replies/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>ThreadReply</c> and returns the created resource.</summary>
    public async Task<ThreadReplyDto?> CreateThreadReplyAsync(CreateThreadReplyRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/thread-replies?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ThreadReplyDto>(cancellationToken);
    }

    /// <summary>Lists all <c>ThreadSubscription</c> items.</summary>
    public async Task<IReadOnlyList<ThreadSubscriptionDto>> GetThreadSubscriptionsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ThreadSubscriptionDto>>(
            "/api/thread-subscriptions?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>ThreadSubscription</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ThreadSubscriptionDto?> GetThreadSubscriptionAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ThreadSubscriptionDto>(
            $"/api/thread-subscriptions/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>ThreadSubscription</c> and returns the created resource.</summary>
    public async Task<ThreadSubscriptionDto?> CreateThreadSubscriptionAsync(CreateThreadSubscriptionRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/thread-subscriptions?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ThreadSubscriptionDto>(cancellationToken);
    }

}
