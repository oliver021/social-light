using SocialLight.EventBus.Events;

namespace SocialLight.Notifications.API.IntegrationEvents;

/// <summary>
/// Local record for the inbound "CommentAdded" integration event
/// (declared in spec.consumes). The routing key matches by class name —
/// the publisher (e.g. Identity.API) defines its own copy; these are distinct
/// assemblies but the event bus resolves by name, not by type identity.
/// </summary>
public record CommentAdded : IntegrationEvent;
