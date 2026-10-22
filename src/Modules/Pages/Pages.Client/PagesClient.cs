using System.Net.Http.Json;
using SocialLight.Pages.Contracts;

namespace SocialLight.Pages.Client;

/// <summary>
/// Typed client for the "Pages" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class PagesClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Page</c> items.</summary>
    public async Task<IReadOnlyList<PageDto>> GetPagesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<PageDto>>(
            "/api/pages?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Page</c> by id, or <c>null</c> if absent.</summary>
    public async Task<PageDto?> GetPageAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<PageDto>(
            $"/api/pages/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Page</c> and returns the created resource.</summary>
    public async Task<PageDto?> CreatePageAsync(CreatePageRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/pages?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PageDto>(cancellationToken);
    }

    /// <summary>Lists all <c>PageRole</c> items.</summary>
    public async Task<IReadOnlyList<PageRoleDto>> GetPageRolesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<PageRoleDto>>(
            "/api/page-roles?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>PageRole</c> by id, or <c>null</c> if absent.</summary>
    public async Task<PageRoleDto?> GetPageRoleAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<PageRoleDto>(
            $"/api/page-roles/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>PageRole</c> and returns the created resource.</summary>
    public async Task<PageRoleDto?> CreatePageRoleAsync(CreatePageRoleRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/page-roles?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PageRoleDto>(cancellationToken);
    }

}
