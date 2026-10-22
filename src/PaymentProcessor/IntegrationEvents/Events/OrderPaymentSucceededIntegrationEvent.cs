namespace SocialLight.PaymentProcessor.IntegrationEvents.Events;

public record OrderPaymentSucceededIntegrationEvent(int OrderId) : IntegrationEvent;
