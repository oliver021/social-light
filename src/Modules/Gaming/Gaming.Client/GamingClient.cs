using System.Net.Http.Json;
using SocialLight.Gaming.Contracts;

namespace SocialLight.Gaming.Client;

/// <summary>
/// Typed client for the "Gaming" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class GamingClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Game</c> items.</summary>
    public async Task<IReadOnlyList<GameDto>> GetGamesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<GameDto>>(
            "/api/games?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Game</c> by id, or <c>null</c> if absent.</summary>
    public async Task<GameDto?> GetGameAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<GameDto>(
            $"/api/games/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Game</c> and returns the created resource.</summary>
    public async Task<GameDto?> CreateGameAsync(CreateGameRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/games?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<GameDto>(cancellationToken);
    }

    /// <summary>Lists all <c>PlayerProfile</c> items.</summary>
    public async Task<IReadOnlyList<PlayerProfileDto>> GetPlayerProfilesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<PlayerProfileDto>>(
            "/api/player-profiles?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>PlayerProfile</c> by id, or <c>null</c> if absent.</summary>
    public async Task<PlayerProfileDto?> GetPlayerProfileAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<PlayerProfileDto>(
            $"/api/player-profiles/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>PlayerProfile</c> and returns the created resource.</summary>
    public async Task<PlayerProfileDto?> CreatePlayerProfileAsync(CreatePlayerProfileRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/player-profiles?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<PlayerProfileDto>(cancellationToken);
    }

    /// <summary>Lists all <c>Achievement</c> items.</summary>
    public async Task<IReadOnlyList<AchievementDto>> GetAchievementsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<AchievementDto>>(
            "/api/achievements?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Achievement</c> by id, or <c>null</c> if absent.</summary>
    public async Task<AchievementDto?> GetAchievementAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<AchievementDto>(
            $"/api/achievements/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Achievement</c> and returns the created resource.</summary>
    public async Task<AchievementDto?> CreateAchievementAsync(CreateAchievementRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/achievements?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<AchievementDto>(cancellationToken);
    }

    /// <summary>Lists all <c>UserAchievement</c> items.</summary>
    public async Task<IReadOnlyList<UserAchievementDto>> GetUserAchievementsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<UserAchievementDto>>(
            "/api/user-achievements?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>UserAchievement</c> by id, or <c>null</c> if absent.</summary>
    public async Task<UserAchievementDto?> GetUserAchievementAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<UserAchievementDto>(
            $"/api/user-achievements/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>UserAchievement</c> and returns the created resource.</summary>
    public async Task<UserAchievementDto?> CreateUserAchievementAsync(CreateUserAchievementRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/user-achievements?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<UserAchievementDto>(cancellationToken);
    }

    /// <summary>Lists all <c>Tournament</c> items.</summary>
    public async Task<IReadOnlyList<TournamentDto>> GetTournamentsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<TournamentDto>>(
            "/api/tournaments?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Tournament</c> by id, or <c>null</c> if absent.</summary>
    public async Task<TournamentDto?> GetTournamentAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<TournamentDto>(
            $"/api/tournaments/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Tournament</c> and returns the created resource.</summary>
    public async Task<TournamentDto?> CreateTournamentAsync(CreateTournamentRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/tournaments?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<TournamentDto>(cancellationToken);
    }

    /// <summary>Lists all <c>Team</c> items.</summary>
    public async Task<IReadOnlyList<TeamDto>> GetTeamsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<TeamDto>>(
            "/api/teams?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Team</c> by id, or <c>null</c> if absent.</summary>
    public async Task<TeamDto?> GetTeamAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<TeamDto>(
            $"/api/teams/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Team</c> and returns the created resource.</summary>
    public async Task<TeamDto?> CreateTeamAsync(CreateTeamRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/teams?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<TeamDto>(cancellationToken);
    }

    /// <summary>Lists all <c>TeamMember</c> items.</summary>
    public async Task<IReadOnlyList<TeamMemberDto>> GetTeamMembersAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<TeamMemberDto>>(
            "/api/team-members?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>TeamMember</c> by id, or <c>null</c> if absent.</summary>
    public async Task<TeamMemberDto?> GetTeamMemberAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<TeamMemberDto>(
            $"/api/team-members/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>TeamMember</c> and returns the created resource.</summary>
    public async Task<TeamMemberDto?> CreateTeamMemberAsync(CreateTeamMemberRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/team-members?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<TeamMemberDto>(cancellationToken);
    }

    /// <summary>Lists all <c>Match</c> items.</summary>
    public async Task<IReadOnlyList<MatchDto>> GetMatchesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<MatchDto>>(
            "/api/matches?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Match</c> by id, or <c>null</c> if absent.</summary>
    public async Task<MatchDto?> GetMatchAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<MatchDto>(
            $"/api/matches/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Match</c> and returns the created resource.</summary>
    public async Task<MatchDto?> CreateMatchAsync(CreateMatchRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/matches?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<MatchDto>(cancellationToken);
    }

    /// <summary>Lists all <c>Leaderboard</c> items.</summary>
    public async Task<IReadOnlyList<LeaderboardDto>> GetLeaderboardsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<LeaderboardDto>>(
            "/api/leaderboards?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Leaderboard</c> by id, or <c>null</c> if absent.</summary>
    public async Task<LeaderboardDto?> GetLeaderboardAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<LeaderboardDto>(
            $"/api/leaderboards/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Leaderboard</c> and returns the created resource.</summary>
    public async Task<LeaderboardDto?> CreateLeaderboardAsync(CreateLeaderboardRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/leaderboards?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<LeaderboardDto>(cancellationToken);
    }

}
