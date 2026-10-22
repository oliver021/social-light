using System.Net.Http.Json;
using SocialLight.Groups.Contracts;

namespace SocialLight.Groups.Client;

/// <summary>
/// Typed client for the "Groups" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class GroupsClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Group</c> items.</summary>
    public async Task<IReadOnlyList<GroupDto>> GetGroupsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<GroupDto>>(
            "/api/groups?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Group</c> by id, or <c>null</c> if absent.</summary>
    public async Task<GroupDto?> GetGroupAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<GroupDto>(
            $"/api/groups/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Group</c> and returns the created resource.</summary>
    public async Task<GroupDto?> CreateGroupAsync(CreateGroupRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/groups?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<GroupDto>(cancellationToken);
    }

    /// <summary>Lists all <c>GroupMember</c> items.</summary>
    public async Task<IReadOnlyList<GroupMemberDto>> GetGroupMembersAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<GroupMemberDto>>(
            "/api/group-members?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>GroupMember</c> by id, or <c>null</c> if absent.</summary>
    public async Task<GroupMemberDto?> GetGroupMemberAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<GroupMemberDto>(
            $"/api/group-members/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>GroupMember</c> and returns the created resource.</summary>
    public async Task<GroupMemberDto?> CreateGroupMemberAsync(CreateGroupMemberRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/group-members?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<GroupMemberDto>(cancellationToken);
    }

}
