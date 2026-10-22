using SocialLight.EventBus.Events;

namespace SocialLight.Profile.API.IntegrationEvents;

/// <summary>
/// Local record for the inbound "UserRegistered" integration event published
/// by Identity.API. The event bus routes by class name, so the payload shape
/// must match the publisher's record — they are separate assemblies by design.
/// </summary>
public record UserRegistered(string UserId, string Email, string DisplayName) : IntegrationEvent;
