namespace SocialLight.PaymentProcessor.IntegrationEvents.Events;

public record OrderStatusChangedToStockConfirmedIntegrationEvent(int OrderId) : IntegrationEvent;
