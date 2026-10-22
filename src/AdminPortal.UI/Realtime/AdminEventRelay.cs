namespace SocialLight.AdminPortal.UI.Realtime;

/// <summary>
/// Seed (category-2): the generic broker-event relay. The aggregate scope registers
/// one closed generic per published event across all modules, so every module event
/// lands here and is pushed to connected admins over SignalR. Canonical v1 events are
/// typed markers, so the relay forwards the event name; enrich when payloads land.
/// </summary>
public sealed class AdminEventRelay<T>(IHubContext<AdminEventHub> hub) : IIntegrationEventHandler<T>
    where T : IntegrationEvent
{
    public Task Handle(T @event) =>
        hub.Clients.All.SendAsync("eventReceived", typeof(T).Name, DateTimeOffset.UtcNow);
}
