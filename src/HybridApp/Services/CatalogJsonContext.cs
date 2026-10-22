using System.Text.Json.Serialization;
using SocialLight.WebAppComponents.Catalog;

namespace SocialLight.HybridApp.Services;

[JsonSerializable(typeof(CatalogItem))]
[JsonSerializable(typeof(CatalogResult))]
[JsonSerializable(typeof(List<CatalogItem>))]
[JsonSerializable(typeof(CatalogBrand[]))]
[JsonSerializable(typeof(CatalogItemType[]))]
[JsonSerializable(typeof(CatalogBrand))]
[JsonSerializable(typeof(CatalogItemType))]
[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase)]
public partial class CatalogJsonContext : JsonSerializerContext
{
}