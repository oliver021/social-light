namespace SocialLight.Recommendation.API.IntegrationEvents;

/// <summary>
/// Handles "ReelCreated" — cascades the lifecycle event to the
/// Recommendation module's data. Written once (category-2 seed); customise the
/// deletion/anonymisation logic below.
/// </summary>
public sealed class ReelCreatedHandler : IIntegrationEventHandler<ReelCreated>
{
    public async Task Handle(ReelCreated @event)
    {
        // TODO: implement. Inject the DbContext to act on module data, e.g.:
        //   public ReelCreatedHandler(RecommendationDbContext db) { ... }
        await Task.CompletedTask;
    }
}
