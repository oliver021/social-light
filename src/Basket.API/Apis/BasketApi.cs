#nullable enable

using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Routing;
using SocialLight.Basket.API.Repositories;
// Model.CustomerBasket collides with the globally-imported gRPC type; alias it so this
// REST adapter unambiguously means the storage model.
using CustomerBasket = SocialLight.Basket.API.Model.CustomerBasket;

namespace SocialLight.Basket.API.Apis;

/// <summary>
/// Browser-facing REST adapter over the Basket. The canonical Basket transport is
/// gRPC (<see cref="Grpc.BasketService"/>) for native/checkout callers, but a browser
/// can't speak gRPC without gRPC-web tooling/protobuf — inconsistent with the rest of
/// this app, whose typed clients come from OpenAPI. So instead of bolting gRPC-web on,
/// we expose the same operations as plain REST over the SAME
/// <see cref="IBasketRepository"/>, reading the buyer id from the JWT `sub` claim.
///
/// SCOPE NOTE: the cart WRITE operations are intentionally left undone for this project
/// (memory: project-marketplace-scope). The marketplace e2e covers Catalog *content*
/// only; payment/checkout (cart writes + Ordering) is not wired. Reads stay live.
/// </summary>
public static class BasketApi
{
    public static RouteGroupBuilder MapBasketApiV1(this IEndpointRouteBuilder app)
    {
        // Every operation is the caller's own basket, keyed by the authenticated `sub`.
        var api = app.MapGroup("api/basket").HasApiVersion(1, 0).RequireAuthorization();

        api.MapGet("/", GetBasket);
        api.MapPut("/", UpdateBasket);
        api.MapDelete("/", DeleteBasket);

        return api;
    }

    private static async Task<Results<Ok<CustomerBasketDto>, UnauthorizedHttpResult>> GetBasket(
        ClaimsPrincipal user, IBasketRepository repository)
    {
        var buyerId = user.GetBuyerId();
        if (string.IsNullOrEmpty(buyerId))
        {
            return TypedResults.Unauthorized();
        }

        var basket = await repository.GetBasketAsync(buyerId);
        return TypedResults.Ok((basket ?? new CustomerBasket(buyerId)).ToDto());
    }

    // DEVELOPMENT NOTE — payment/checkout is INTENTIONALLY left undone for this project
    // (memory: project-marketplace-scope). These cart writes lead into the checkout/
    // payment flow, which we deliberately don't build or e2e-test here. The explicit
    // throw makes the gap unmistakable rather than silently half-working. To resume:
    // mirror Grpc.BasketService.UpdateBasket/DeleteBasket over IBasketRepository.
    private static Results<Ok<CustomerBasketDto>, UnauthorizedHttpResult, NotFound> UpdateBasket(
        UpdateBasketRequest request, ClaimsPrincipal user, IBasketRepository repository) =>
        throw PaymentLeftUndone();

    private static Results<NoContent, UnauthorizedHttpResult> DeleteBasket(
        ClaimsPrincipal user, IBasketRepository repository) =>
        throw PaymentLeftUndone();

    private static NotImplementedException PaymentLeftUndone() =>
        new("Marketplace payment/checkout is intentionally left undone for this project " +
            "(Basket cart writes + Ordering). The marketplace e2e covers Catalog content only. " +
            "See memory: project-marketplace-scope.");

    // Same identity source the gRPC path uses (sub == the social user == the buyer).
    private static string? GetBuyerId(this ClaimsPrincipal user) => user.FindFirst("sub")?.Value;

    private static CustomerBasketDto ToDto(this CustomerBasket basket) =>
        new(basket.BuyerId,
            basket.Items
                .Select(i => new BasketItemDto(i.ProductId, i.Quantity, i.ProductName, i.UnitPrice, i.PictureUrl))
                .ToList());
}

public record BasketItemDto(
    int ProductId,
    int Quantity,
    string? ProductName = null,
    decimal UnitPrice = 0,
    string? PictureUrl = null);

public record CustomerBasketDto(string BuyerId, List<BasketItemDto> Items);

public record UpdateBasketRequest(List<BasketItemDto> Items);
