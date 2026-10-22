namespace SocialLight.Jobs.API.IntegrationEvents;

/// <summary>
/// Handles "OrganizationDeleted" — cascades the lifecycle event to the
/// Jobs module's data. Written once (category-2 seed); customise the
/// deletion/anonymisation logic below.
/// </summary>
public sealed class OrganizationDeletedHandler : IIntegrationEventHandler<OrganizationDeleted>
{
    public async Task Handle(OrganizationDeleted @event)
    {
        // TODO: implement. Inject the DbContext to act on module data, e.g.:
        //   public OrganizationDeletedHandler(JobsDbContext db) { ... }
        await Task.CompletedTask;
    }
}
