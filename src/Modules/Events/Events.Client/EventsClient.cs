using System.Net.Http.Json;
using SocialLight.Events.Contracts;

namespace SocialLight.Events.Client;

/// <summary>
/// Typed client for the "Events" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class EventsClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Event</c> items.</summary>
    public async Task<IReadOnlyList<EventDto>> GetEventsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<EventDto>>(
            "/api/events?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Event</c> by id, or <c>null</c> if absent.</summary>
    public async Task<EventDto?> GetEventAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<EventDto>(
            $"/api/events/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Event</c> and returns the created resource.</summary>
    public async Task<EventDto?> CreateEventAsync(CreateEventRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/events?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<EventDto>(cancellationToken);
    }

    /// <summary>Lists all <c>EventAttendance</c> items.</summary>
    public async Task<IReadOnlyList<EventAttendanceDto>> GetEventAttendancesAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<EventAttendanceDto>>(
            "/api/event-attendances?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>EventAttendance</c> by id, or <c>null</c> if absent.</summary>
    public async Task<EventAttendanceDto?> GetEventAttendanceAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<EventAttendanceDto>(
            $"/api/event-attendances/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>EventAttendance</c> and returns the created resource.</summary>
    public async Task<EventAttendanceDto?> CreateEventAttendanceAsync(CreateEventAttendanceRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/event-attendances?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<EventAttendanceDto>(cancellationToken);
    }

}
