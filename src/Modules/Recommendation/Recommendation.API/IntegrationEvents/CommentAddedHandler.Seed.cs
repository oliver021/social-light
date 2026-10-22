namespace SocialLight.Recommendation.API.IntegrationEvents;

/// <summary>
/// Handles "CommentAdded" — cascades the lifecycle event to the
/// Recommendation module's data. Written once (category-2 seed); customise the
/// deletion/anonymisation logic below.
/// </summary>
public sealed class CommentAddedHandler : IIntegrationEventHandler<CommentAdded>
{
    public async Task Handle(CommentAdded @event)
    {
        // TODO: implement. Inject the DbContext to act on module data, e.g.:
        //   public CommentAddedHandler(RecommendationDbContext db) { ... }
        await Task.CompletedTask;
    }
}
