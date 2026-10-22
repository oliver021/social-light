namespace SocialLight.Threads.API.IntegrationEvents;

/// <summary>
/// Handles "UserDeleted" — cascades the lifecycle event to the
/// Threads module's data. Written once (category-2 seed); customise the
/// deletion/anonymisation logic below.
/// </summary>
public sealed class UserDeletedHandler : IIntegrationEventHandler<UserDeleted>
{
    public async Task Handle(UserDeleted @event)
    {
        // TODO: implement. Inject the DbContext to act on module data, e.g.:
        //   public UserDeletedHandler(ThreadsDbContext db) { ... }
        await Task.CompletedTask;
    }
}
