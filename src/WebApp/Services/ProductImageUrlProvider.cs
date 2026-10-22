using SocialLight.WebAppComponents.Services;

namespace SocialLight.WebApp.Services;

public class ProductImageUrlProvider : IProductImageUrlProvider
{
    public string GetProductImageUrl(int productId)
        => $"product-images/{productId}?api-version=2.0";
}
