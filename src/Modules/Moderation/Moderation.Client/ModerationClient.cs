using System.Net.Http.Json;
using SocialLight.Moderation.Contracts;

namespace SocialLight.Moderation.Client;

/// <summary>
/// Typed client for the "Moderation" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class ModerationClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Report</c> items.</summary>
    public async Task<IReadOnlyList<ReportDto>> GetReportsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ReportDto>>(
            "/api/reports?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Report</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ReportDto?> GetReportAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ReportDto>(
            $"/api/reports/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Report</c> and returns the created resource.</summary>
    public async Task<ReportDto?> CreateReportAsync(CreateReportRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/reports?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ReportDto>(cancellationToken);
    }

    /// <summary>Lists all <c>ModerationCase</c> items.</summary>
    public async Task<IReadOnlyList<ModerationCaseDto>> GetModerationCasesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ModerationCaseDto>>(
            "/api/moderation-cases?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>ModerationCase</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ModerationCaseDto?> GetModerationCaseAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ModerationCaseDto>(
            $"/api/moderation-cases/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>ModerationCase</c> and returns the created resource.</summary>
    public async Task<ModerationCaseDto?> CreateModerationCaseAsync(CreateModerationCaseRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/moderation-cases?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ModerationCaseDto>(cancellationToken);
    }

    /// <summary>Lists all <c>ModerationAction</c> items.</summary>
    public async Task<IReadOnlyList<ModerationActionDto>> GetModerationActionsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ModerationActionDto>>(
            "/api/moderation-actions?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>ModerationAction</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ModerationActionDto?> GetModerationActionAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ModerationActionDto>(
            $"/api/moderation-actions/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>ModerationAction</c> and returns the created resource.</summary>
    public async Task<ModerationActionDto?> CreateModerationActionAsync(CreateModerationActionRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/moderation-actions?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ModerationActionDto>(cancellationToken);
    }

    /// <summary>Lists all <c>ModerationNote</c> items.</summary>
    public async Task<IReadOnlyList<ModerationNoteDto>> GetModerationNotesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<ModerationNoteDto>>(
            "/api/moderation-notes?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>ModerationNote</c> by id, or <c>null</c> if absent.</summary>
    public async Task<ModerationNoteDto?> GetModerationNoteAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<ModerationNoteDto>(
            $"/api/moderation-notes/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>ModerationNote</c> and returns the created resource.</summary>
    public async Task<ModerationNoteDto?> CreateModerationNoteAsync(CreateModerationNoteRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/moderation-notes?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<ModerationNoteDto>(cancellationToken);
    }

    /// <summary>Lists all <c>Appeal</c> items.</summary>
    public async Task<IReadOnlyList<AppealDto>> GetAppealsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<AppealDto>>(
            "/api/appeals?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Appeal</c> by id, or <c>null</c> if absent.</summary>
    public async Task<AppealDto?> GetAppealAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<AppealDto>(
            $"/api/appeals/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Appeal</c> and returns the created resource.</summary>
    public async Task<AppealDto?> CreateAppealAsync(CreateAppealRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/appeals?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<AppealDto>(cancellationToken);
    }

}
