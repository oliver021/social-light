using SocialLight.EventBus.Events;

namespace SocialLight.Identity.API.IntegrationEvents;

/// <summary>
/// Published after a new user successfully registers via <c>POST /api/account/register</c>.
/// Consumers (e.g. Profile.API) react by pre-creating a profile shell so the user
/// is visible immediately — no lazy-upsert-on-first-edit required.
/// </summary>
public record UserRegistered(string UserId, string Email, string DisplayName) : IntegrationEvent;
