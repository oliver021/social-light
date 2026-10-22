using Microsoft.Extensions.Logging;
using SocialLight.EventBus.Abstractions;
using SocialLight.Profile.API.Domain;
using SocialLight.Profile.API.IntegrationEvents;

namespace SocialLight.Profile.API.Application;

/// <summary>
/// Reacts to a new user registration by pre-creating a profile shell so the
/// profile exists immediately — no lazy upsert-on-first-edit required.
/// Uses INSERT … ON CONFLICT DO NOTHING semantics (skip if already exists).
/// </summary>
public sealed class UserRegisteredHandler(
    ProfileDbContext db,
    ILogger<UserRegisteredHandler> logger) : IIntegrationEventHandler<UserRegistered>
{
    public async Task Handle(UserRegistered @event)
    {
        if (!Guid.TryParse(@event.UserId, out var userId))
        {
            logger.LogWarning("UserRegistered: invalid UserId {UserId}", @event.UserId);
            return;
        }

        var exists = await db.Profiles.AnyAsync(p => p.UserId == userId);
        if (exists)
        {
            return;
        }

        var profile = new UserProfile(userId, @event.DisplayName);
        db.Profiles.Add(profile);
        await db.SaveChangesAsync();

        logger.LogInformation("Pre-created profile for new user {UserId}", userId);
    }
}
