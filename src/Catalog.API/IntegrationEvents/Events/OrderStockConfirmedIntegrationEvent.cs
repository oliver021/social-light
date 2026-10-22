namespace SocialLight.Catalog.API.IntegrationEvents.Events;

public record OrderStockConfirmedIntegrationEvent(int OrderId) : IntegrationEvent;
