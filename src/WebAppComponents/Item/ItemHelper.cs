using SocialLight.WebAppComponents.Catalog;

namespace SocialLight.WebAppComponents.Item;

public static class ItemHelper
{
    public static string Url(CatalogItem item)
        => $"item/{item.Id}";
}
