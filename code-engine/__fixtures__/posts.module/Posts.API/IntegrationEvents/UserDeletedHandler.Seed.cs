namespace SocialLight.Posts.API.IntegrationEvents;

/// <summary>
/// Handles "UserDeleted" — cascades the lifecycle event to the
/// Posts module's data. Written once (category-2 seed); customise the
/// deletion/anonymisation logic below.
/// </summary>
public sealed class UserDeletedHandler : IIntegrationEventHandler<UserDeleted>
{
    public async Task Handle(UserDeleted @event)
    {
        // TODO: implement. Inject the DbContext to act on module data, e.g.:
        //   public UserDeletedHandler(PostsDbContext db) { ... }
        await Task.CompletedTask;
    }
}
