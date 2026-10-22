namespace SocialLight.Engagement.API.IntegrationEvents;

/// <summary>
/// Handles "PostRemoved" â€” cascades the lifecycle event to the
/// Engagement module's data. Written once (category-2 seed); customise the
/// deletion/anonymisation logic below.
/// </summary>
public sealed class PostRemovedHandler : IIntegrationEventHandler<PostRemoved>
{
    public async Task Handle(PostRemoved @event)
    {
        // TODO: delete or anonymise Engagement data owned by the deleted user.
        // Example: await db.Posts.Where(p => p.AuthorId == Guid.Parse(@event.UserId)).ExecuteDeleteAsync();
        await Task.CompletedTask;
    }
}
