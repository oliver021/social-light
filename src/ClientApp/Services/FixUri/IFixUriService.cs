using SocialLight.ClientApp.Models.Basket;
using SocialLight.ClientApp.Models.Catalog;
using SocialLight.ClientApp.Models.Marketing;

namespace SocialLight.ClientApp.Services.FixUri;

public interface IFixUriService
{
    void FixCatalogItemPictureUri(IEnumerable<CatalogItem> catalogItems);
    void FixBasketItemPictureUri(IEnumerable<BasketItem> basketItems);
    void FixCampaignItemPictureUri(IEnumerable<CampaignItem> campaignItems);
}
