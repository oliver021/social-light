using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.SignalR.Client;

namespace SocialLight.AdminPortal.UI.Client.Realtime;

/// <summary>One broker event, as surfaced to the admin UI.</summary>
public sealed record AdminEvent(string Name, DateTimeOffset At);

/// <summary>
/// Seed (category-2): the WASM-side SignalR client. It connects to the host hub, which
/// is fed by the broker (no polling) — so the UI updates when ANY module publishes an
/// integration event. Own this: filter by module, raise toasts, drive live counters.
/// </summary>
public sealed class AdminHubClient(NavigationManager nav) : IAsyncDisposable
{
    private readonly List<AdminEvent> _recent = [];
    private HubConnection? _connection;

    public IReadOnlyList<AdminEvent> Recent => _recent;
    public event Action? Changed;

    public async Task StartAsync()
    {
        if (_connection is not null) return;

        _connection = new HubConnectionBuilder()
            .WithUrl(nav.ToAbsoluteUri("/hubs/admin-events"))
            .WithAutomaticReconnect()
            .Build();

        _connection.On<string, DateTimeOffset>("eventReceived", (name, at) =>
        {
            _recent.Insert(0, new AdminEvent(name, at));
            if (_recent.Count > 100) _recent.RemoveAt(_recent.Count - 1);
            Changed?.Invoke();
        });

        // The hub requires auth; until admin login lands this throws — swallow so the
        // rest of the portal renders. Reconnect happens automatically once authorized.
        try { await _connection.StartAsync(); }
        catch { /* not authenticated yet */ }
    }

    public async ValueTask DisposeAsync()
    {
        if (_connection is not null) await _connection.DisposeAsync();
    }
}
