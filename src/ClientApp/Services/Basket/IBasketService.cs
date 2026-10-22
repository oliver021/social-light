using SocialLight.ClientApp.Models.Basket;

namespace SocialLight.ClientApp.Services.Basket;

public interface IBasketService
{
    IEnumerable<BasketItem> LocalBasketItems { get; set; }
    Task<CustomerBasket> GetBasketAsync();
    Task<CustomerBasket> UpdateBasketAsync(CustomerBasket customerBasket);
    Task ClearBasketAsync();
}
