using System.Text.Json.Serialization;
using SocialLight.ClientApp.Models.Catalog;
using SocialLight.ClientApp.Models.Orders;
using SocialLight.ClientApp.Models.Token;

namespace SocialLight.ClientApp.Services;

[JsonSourceGenerationOptions(
    PropertyNameCaseInsensitive = true,
    NumberHandling = JsonNumberHandling.AllowReadingFromString)]
[JsonSerializable(typeof(CancelOrderCommand))]
[JsonSerializable(typeof(CatalogBrand))]
[JsonSerializable(typeof(CatalogItem))]
[JsonSerializable(typeof(CatalogRoot))]
[JsonSerializable(typeof(CatalogType))]
[JsonSerializable(typeof(Models.Orders.Order))]
[JsonSerializable(typeof(Models.Location.Location))]
[JsonSerializable(typeof(UserToken))]
internal partial class SocialLightJsonSerializerContext : JsonSerializerContext
{
}
