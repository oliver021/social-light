namespace SocialLight.Jobs.API.IntegrationEvents;

/// <summary>
/// Handles "UserDeleted" — cascades the lifecycle event to the
/// Jobs module's data. Written once (category-2 seed); customise the
/// deletion/anonymisation logic below.
/// </summary>
public sealed class UserDeletedHandler : IIntegrationEventHandler<UserDeleted>
{
    public async Task Handle(UserDeleted @event)
    {
        // TODO: implement. Inject the DbContext to act on module data, e.g.:
        //   public UserDeletedHandler(JobsDbContext db) { ... }
        await Task.CompletedTask;
    }
}
