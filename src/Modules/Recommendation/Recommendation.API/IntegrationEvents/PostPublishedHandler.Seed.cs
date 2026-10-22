namespace SocialLight.Recommendation.API.IntegrationEvents;

/// <summary>
/// Handles "PostPublished" — cascades the lifecycle event to the
/// Recommendation module's data. Written once (category-2 seed); customise the
/// deletion/anonymisation logic below.
/// </summary>
public sealed class PostPublishedHandler : IIntegrationEventHandler<PostPublished>
{
    public async Task Handle(PostPublished @event)
    {
        // TODO: implement. Inject the DbContext to act on module data, e.g.:
        //   public PostPublishedHandler(RecommendationDbContext db) { ... }
        await Task.CompletedTask;
    }
}
