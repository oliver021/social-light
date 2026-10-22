namespace SocialLight.Recommendation.API.IntegrationEvents;

/// <summary>
/// Handles "ReactionAdded" — cascades the lifecycle event to the
/// Recommendation module's data. Written once (category-2 seed); customise the
/// deletion/anonymisation logic below.
/// </summary>
public sealed class ReactionAddedHandler : IIntegrationEventHandler<ReactionAdded>
{
    public async Task Handle(ReactionAdded @event)
    {
        // TODO: implement. Inject the DbContext to act on module data, e.g.:
        //   public ReactionAddedHandler(RecommendationDbContext db) { ... }
        await Task.CompletedTask;
    }
}
