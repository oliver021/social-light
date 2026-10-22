using System.Net.Http.Json;
using SocialLight.Organizations.Contracts;

namespace SocialLight.Organizations.Client;

/// <summary>
/// Typed client for the "Organizations" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class OrganizationsClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Organization</c> items.</summary>
    public async Task<IReadOnlyList<OrganizationDto>> GetOrganizationsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<OrganizationDto>>(
            "/api/organizations?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Organization</c> by id, or <c>null</c> if absent.</summary>
    public async Task<OrganizationDto?> GetOrganizationAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<OrganizationDto>(
            $"/api/organizations/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Organization</c> and returns the created resource.</summary>
    public async Task<OrganizationDto?> CreateOrganizationAsync(CreateOrganizationRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/organizations?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<OrganizationDto>(cancellationToken);
    }

    /// <summary>Lists all <c>OrganizationMember</c> items.</summary>
    public async Task<IReadOnlyList<OrganizationMemberDto>> GetOrganizationMembersAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<OrganizationMemberDto>>(
            "/api/organization-members?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>OrganizationMember</c> by id, or <c>null</c> if absent.</summary>
    public async Task<OrganizationMemberDto?> GetOrganizationMemberAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<OrganizationMemberDto>(
            $"/api/organization-members/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>OrganizationMember</c> and returns the created resource.</summary>
    public async Task<OrganizationMemberDto?> CreateOrganizationMemberAsync(CreateOrganizationMemberRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/organization-members?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<OrganizationMemberDto>(cancellationToken);
    }

}
