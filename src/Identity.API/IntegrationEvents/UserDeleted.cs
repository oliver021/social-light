using SocialLight.EventBus.Events;

namespace SocialLight.Identity.API.IntegrationEvents;

/// <summary>
/// Published when a user permanently deletes their account via
/// <c>POST /api/account/delete</c>. Consumers (modules) cascade-delete or
/// anonymise the user's data (posts, comments, reactions, …) in reaction.
/// </summary>
public record UserDeleted(string UserId, string Email) : IntegrationEvent;
