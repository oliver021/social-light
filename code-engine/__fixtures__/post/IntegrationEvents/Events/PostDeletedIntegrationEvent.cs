using EventBus.Events;

namespace socialLight.Posts.API.IntegrationEvents;

// One file per entry in spec.events (path token __event__ fans out per event).
public record PostDeletedIntegrationEvent(Guid Id) : IntegrationEvent;
