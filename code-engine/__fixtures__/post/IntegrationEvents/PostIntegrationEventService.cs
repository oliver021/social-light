using EventBus.Abstractions;
using socialLight.Posts.API.Model;

namespace socialLight.Posts.API.IntegrationEvents;

public interface IPostIntegrationEventService
{
    Task PublishPostCreatedAsync(Post post);
    Task PublishPostDeletedAsync(Post post);
}

// Publishes Post integration events through the event bus.
// NOTE: for the transactional outbox, persist + publish in one transaction via
// IntegrationEventLogEF (see CLAUDE.md §4.5) — wire that in here.
public class PostIntegrationEventService(IEventBus eventBus) : IPostIntegrationEventService
{
    public Task PublishPostCreatedAsync(Post post)
        => eventBus.PublishAsync(new PostCreatedIntegrationEvent(post.Id));
    public Task PublishPostDeletedAsync(Post post)
        => eventBus.PublishAsync(new PostDeletedIntegrationEvent(post.Id));
}
