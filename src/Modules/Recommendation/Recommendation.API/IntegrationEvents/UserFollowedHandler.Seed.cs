namespace SocialLight.Recommendation.API.IntegrationEvents;

/// <summary>
/// Handles "UserFollowed" — cascades the lifecycle event to the
/// Recommendation module's data. Written once (category-2 seed); customise the
/// deletion/anonymisation logic below.
/// </summary>
public sealed class UserFollowedHandler : IIntegrationEventHandler<UserFollowed>
{
    public async Task Handle(UserFollowed @event)
    {
        // TODO: implement. Inject the DbContext to act on module data, e.g.:
        //   public UserFollowedHandler(RecommendationDbContext db) { ... }
        await Task.CompletedTask;
    }
}
