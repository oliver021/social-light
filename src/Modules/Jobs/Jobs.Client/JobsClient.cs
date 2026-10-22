using System.Net.Http.Json;
using SocialLight.Jobs.Contracts;

namespace SocialLight.Jobs.Client;

/// <summary>
/// Typed client for the "Jobs" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class JobsClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>JobCategory</c> items.</summary>
    public async Task<IReadOnlyList<JobCategoryDto>> GetJobCategoriesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<JobCategoryDto>>(
            "/api/job-categories?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>JobCategory</c> by id, or <c>null</c> if absent.</summary>
    public async Task<JobCategoryDto?> GetJobCategoryAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<JobCategoryDto>(
            $"/api/job-categories/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>JobCategory</c> and returns the created resource.</summary>
    public async Task<JobCategoryDto?> CreateJobCategoryAsync(CreateJobCategoryRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/job-categories?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JobCategoryDto>(cancellationToken);
    }

    /// <summary>Lists all <c>JobPosition</c> items.</summary>
    public async Task<IReadOnlyList<JobPositionDto>> GetJobPositionsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<JobPositionDto>>(
            "/api/job-positions?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>JobPosition</c> by id, or <c>null</c> if absent.</summary>
    public async Task<JobPositionDto?> GetJobPositionAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<JobPositionDto>(
            $"/api/job-positions/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>JobPosition</c> and returns the created resource.</summary>
    public async Task<JobPositionDto?> CreateJobPositionAsync(CreateJobPositionRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/job-positions?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JobPositionDto>(cancellationToken);
    }

    /// <summary>Lists all <c>JobApplication</c> items.</summary>
    public async Task<IReadOnlyList<JobApplicationDto>> GetJobApplicationsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<JobApplicationDto>>(
            "/api/job-applications?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>JobApplication</c> by id, or <c>null</c> if absent.</summary>
    public async Task<JobApplicationDto?> GetJobApplicationAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<JobApplicationDto>(
            $"/api/job-applications/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>JobApplication</c> and returns the created resource.</summary>
    public async Task<JobApplicationDto?> CreateJobApplicationAsync(CreateJobApplicationRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/job-applications?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<JobApplicationDto>(cancellationToken);
    }

}
