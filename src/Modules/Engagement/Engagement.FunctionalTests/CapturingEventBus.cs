using System.Collections.Concurrent;

namespace Engagement.FunctionalTests;

/// <summary>
/// In-memory <see cref="IEventBus"/> used by the functional tests instead of the
/// RabbitMQ binding (DESIGN-STRATEGY.md §4: "RabbitMQ, Service Bus, in-memory for
/// tests" — the transport is a host-level binding). Capturing what was published
/// lets a test assert the module's outbound contract without a broker.
/// </summary>
public sealed class CapturingEventBus : IEventBus
{
    private readonly ConcurrentQueue<IntegrationEvent> _published = new();

    public IReadOnlyCollection<IntegrationEvent> Published => _published;

    public Task PublishAsync(IntegrationEvent @event)
    {
        _published.Enqueue(@event);
        return Task.CompletedTask;
    }
}
