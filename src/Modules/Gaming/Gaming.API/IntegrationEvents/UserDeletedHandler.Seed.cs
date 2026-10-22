namespace SocialLight.Gaming.API.IntegrationEvents;

/// <summary>
/// Handles "UserDeleted" — cascades the lifecycle event to the
/// Gaming module's data. Written once (category-2 seed); customise the
/// deletion/anonymisation logic below.
/// </summary>
public sealed class UserDeletedHandler : IIntegrationEventHandler<UserDeleted>
{
    public async Task Handle(UserDeleted @event)
    {
        // TODO: implement. Inject the DbContext to act on module data, e.g.:
        //   public UserDeletedHandler(GamingDbContext db) { ... }
        await Task.CompletedTask;
    }
}
