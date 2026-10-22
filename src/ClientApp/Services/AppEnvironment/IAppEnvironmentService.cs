using SocialLight.ClientApp.Services.Basket;
using SocialLight.ClientApp.Services.Catalog;
using SocialLight.ClientApp.Services.Identity;
using SocialLight.ClientApp.Services.Order;

namespace SocialLight.ClientApp.Services.AppEnvironment;

public interface IAppEnvironmentService
{
    IBasketService BasketService { get; }

    ICatalogService CatalogService { get; }

    IOrderService OrderService { get; }

    IIdentityService IdentityService { get; }

    void UpdateDependencies(bool useMockServices);
}
