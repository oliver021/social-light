using SocialLight.ClientApp.Models.Basket;

namespace SocialLight.ClientApp.Services.Order;

public interface IOrderService
{
    Task CreateOrderAsync(Models.Orders.Order newOrder);

    Task<IEnumerable<Models.Orders.Order>> GetOrdersAsync();

    Task<Models.Orders.Order> GetOrderAsync(int orderId);

    Task<bool> CancelOrderAsync(int orderId);

    OrderCheckout MapOrderToBasket(Models.Orders.Order order);
}
