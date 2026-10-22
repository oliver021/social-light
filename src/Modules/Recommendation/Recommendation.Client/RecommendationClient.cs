using System.Net.Http.Json;
using SocialLight.Recommendation.Contracts;

namespace SocialLight.Recommendation.Client;

/// <summary>
/// Typed client for the "Recommendation" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class RecommendationClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>UserInterest</c> items.</summary>
    public async Task<IReadOnlyList<UserInterestDto>> GetUserInterestsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<UserInterestDto>>(
            "/api/user-interests?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>UserInterest</c> by id, or <c>null</c> if absent.</summary>
    public async Task<UserInterestDto?> GetUserInterestAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<UserInterestDto>(
            $"/api/user-interests/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>UserInterest</c> and returns the created resource.</summary>
    public async Task<UserInterestDto?> CreateUserInterestAsync(CreateUserInterestRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/user-interests?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<UserInterestDto>(cancellationToken);
    }

    /// <summary>Lists all <c>ContentScore</c> items.</summary>
    public async Task<IReadOnlyList<ContentScoreDto>> GetContentScoresAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ContentScoreDto>>(
            "/api/content-scores?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>ContentScore</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ContentScoreDto?> GetContentScoreAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ContentScoreDto>(
            $"/api/content-scores/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>ContentScore</c> and returns the created resource.</summary>
    public async Task<ContentScoreDto?> CreateContentScoreAsync(CreateContentScoreRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/content-scores?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ContentScoreDto>(cancellationToken);
    }

    /// <summary>Lists all <c>FeedRanking</c> items.</summary>
    public async Task<IReadOnlyList<FeedRankingDto>> GetFeedRankingsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<FeedRankingDto>>(
            "/api/feed-rankings?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>FeedRanking</c> by id, or <c>null</c> if absent.</summary>
    public async Task<FeedRankingDto?> GetFeedRankingAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<FeedRankingDto>(
            $"/api/feed-rankings/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>FeedRanking</c> and returns the created resource.</summary>
    public async Task<FeedRankingDto?> CreateFeedRankingAsync(CreateFeedRankingRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/feed-rankings?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<FeedRankingDto>(cancellationToken);
    }

    /// <summary>Lists all <c>RecommendationCandidate</c> items.</summary>
    public async Task<IReadOnlyList<RecommendationCandidateDto>> GetRecommendationCandidatesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<RecommendationCandidateDto>>(
            "/api/recommendation-candidates?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>RecommendationCandidate</c> by id, or <c>null</c> if absent.</summary>
    public async Task<RecommendationCandidateDto?> GetRecommendationCandidateAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<RecommendationCandidateDto>(
            $"/api/recommendation-candidates/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>RecommendationCandidate</c> and returns the created resource.</summary>
    public async Task<RecommendationCandidateDto?> CreateRecommendationCandidateAsync(CreateRecommendationCandidateRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/recommendation-candidates?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<RecommendationCandidateDto>(cancellationToken);
    }

    /// <summary>Lists all <c>TrendingTopic</c> items.</summary>
    public async Task<IReadOnlyList<TrendingTopicDto>> GetTrendingTopicsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<TrendingTopicDto>>(
            "/api/trending-topics?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>TrendingTopic</c> by id, or <c>null</c> if absent.</summary>
    public async Task<TrendingTopicDto?> GetTrendingTopicAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<TrendingTopicDto>(
            $"/api/trending-topics/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>TrendingTopic</c> and returns the created resource.</summary>
    public async Task<TrendingTopicDto?> CreateTrendingTopicAsync(CreateTrendingTopicRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/trending-topics?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<TrendingTopicDto>(cancellationToken);
    }

    /// <summary>Lists all <c>Hashtag</c> items.</summary>
    public async Task<IReadOnlyList<HashtagDto>> GetHashtagsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<HashtagDto>>(
            "/api/hashtags?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Hashtag</c> by id, or <c>null</c> if absent.</summary>
    public async Task<HashtagDto?> GetHashtagAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<HashtagDto>(
            $"/api/hashtags/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Hashtag</c> and returns the created resource.</summary>
    public async Task<HashtagDto?> CreateHashtagAsync(CreateHashtagRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/hashtags?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<HashtagDto>(cancellationToken);
    }

    /// <summary>Lists all <c>Topic</c> items.</summary>
    public async Task<IReadOnlyList<TopicDto>> GetTopicsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<TopicDto>>(
            "/api/topics?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Topic</c> by id, or <c>null</c> if absent.</summary>
    public async Task<TopicDto?> GetTopicAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<TopicDto>(
            $"/api/topics/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Topic</c> and returns the created resource.</summary>
    public async Task<TopicDto?> CreateTopicAsync(CreateTopicRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/topics?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<TopicDto>(cancellationToken);
    }

}
