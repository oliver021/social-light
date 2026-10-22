using System.Net.Http.Json;
using SocialLight.Notifications.Contracts;

namespace SocialLight.Notifications.Client;

/// <summary>
/// Typed client for the "Notifications" module API (DESIGN-STRATEGY.md §5). A
/// generated CRUD page and a hand-built page (feed, profile, ...) both consume
/// this; neither knows whether the other exists. The seam between generated and
/// manual code rides on this contract — it does not break decoupling, it relies
/// on it (§6).
/// </summary>
public class NotificationsClient(HttpClient httpClient)
{
    /// <summary>Lists all <c>Notification</c> items.</summary>
    public async Task<IReadOnlyList<NotificationDto>> GetNotificationsAsync(CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<IReadOnlyList<NotificationDto>>(
            "/api/notifications?api-version=1.0", cancellationToken) ?? [];

    /// <summary>Gets a single <c>Notification</c> by id, or <c>null</c> if absent.</summary>
    public async Task<NotificationDto?> GetNotificationAsync(Guid id, CancellationToken cancellationToken = default)
        => await httpClient.GetFromJsonAsync<NotificationDto>(
            $"/api/notifications/{id}?api-version=1.0", cancellationToken);

    /// <summary>Creates a <c>Notification</c> and returns the created resource.</summary>
    public async Task<NotificationDto?> CreateNotificationAsync(CreateNotificationRequest request, CancellationToken cancellationToken = default)
    {
        var response = await httpClient.PostAsJsonAsync(
            "/api/notifications?api-version=1.0", request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<NotificationDto>(cancellationToken);
    }

}
