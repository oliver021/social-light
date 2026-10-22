namespace SocialLight.Notifications.API.IntegrationEvents;

/// <summary>
/// Handles "ThreadReplyAdded" â€” cascades the lifecycle event to the
/// Notifications module's data. Written once (category-2 seed); customise the
/// deletion/anonymisation logic below.
/// </summary>
public sealed class ThreadReplyAddedHandler : IIntegrationEventHandler<ThreadReplyAdded>
{
    public async Task Handle(ThreadReplyAdded @event)
    {
        // TODO: delete or anonymise Notifications data owned by the deleted user.
        // Example: await db.Posts.Where(p => p.AuthorId == Guid.Parse(@event.UserId)).ExecuteDeleteAsync();
        await Task.CompletedTask;
    }
}
