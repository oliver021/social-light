using Microsoft.AspNetCore.Http.HttpResults;
using CardType = SocialLight.Ordering.API.Application.Queries.CardType;
using Order = SocialLight.Ordering.API.Application.Queries.Order;

public static class OrdersApi
{
    public static RouteGroupBuilder MapOrdersApiV1(this IEndpointRouteBuilder app)
    {
        var api = app.MapGroup("api/orders").HasApiVersion(1.0);

        api.MapPut("/cancel", CancelOrderAsync);
        api.MapPut("/ship", ShipOrderAsync);
        api.MapGet("{orderId:int}", GetOrderAsync);
        api.MapGet("/", GetOrdersByUserAsync);
        api.MapGet("/cardtypes", GetCardTypesAsync);
        api.MapPost("/draft", CreateOrderDraftAsync);
        api.MapPost("/", CreateOrderAsync);

        return api;
    }

    public static async Task<Results<Ok, BadRequest<string>, ProblemHttpResult>> CancelOrderAsync(
        [FromHeader(Name = "x-requestid")] Guid requestId,
        CancelOrderCommand command,
        [AsParameters] OrderServices services)
    {
        if (requestId == Guid.Empty)
        {
            return TypedResults.BadRequest("Empty GUID is not valid for request ID");
        }

        var requestCancelOrder = new IdentifiedCommand<CancelOrderCommand, bool>(command, requestId);

        services.Logger.LogInformation(
            "Sending command: {CommandName} - {IdProperty}: {CommandId} ({@Command})",
            requestCancelOrder.GetGenericTypeName(),
            nameof(requestCancelOrder.Command.OrderNumber),
            requestCancelOrder.Command.OrderNumber,
            requestCancelOrder);

        var commandResult = await services.Mediator.Send(requestCancelOrder);

        if (!commandResult)
        {
            return TypedResults.Problem(detail: "Cancel order failed to process.", statusCode: 500);
        }

        return TypedResults.Ok();
    }

    public static async Task<Results<Ok, BadRequest<string>, ProblemHttpResult>> ShipOrderAsync(
        [FromHeader(Name = "x-requestid")] Guid requestId,
        ShipOrderCommand command,
        [AsParameters] OrderServices services)
    {
        if (requestId == Guid.Empty)
        {
            return TypedResults.BadRequest("Empty GUID is not valid for request ID");
        }

        var requestShipOrder = new IdentifiedCommand<ShipOrderCommand, bool>(command, requestId);

        services.Logger.LogInformation(
            "Sending command: {CommandName} - {IdProperty}: {CommandId} ({@Command})",
            requestShipOrder.GetGenericTypeName(),
            nameof(requestShipOrder.Command.OrderNumber),
            requestShipOrder.Command.OrderNumber,
            requestShipOrder);

        var commandResult = await services.Mediator.Send(requestShipOrder);

        if (!commandResult)
        {
            return TypedResults.Problem(detail: "Ship order failed to process.", statusCode: 500);
        }

        return TypedResults.Ok();
    }

    public static async Task<Results<Ok<Order>, NotFound>> GetOrderAsync(int orderId, [AsParameters] OrderServices services)
    {
        try
        {
            var order = await services.Queries.GetOrderAsync(orderId);
            return TypedResults.Ok(order);
        }
        catch
        {
            return TypedResults.NotFound();
        }
    }

    public static async Task<Ok<IEnumerable<OrderSummary>>> GetOrdersByUserAsync([AsParameters] OrderServices services)
    {
        var userId = services.IdentityService.GetUserIdentity();
        var orders = await services.Queries.GetOrdersFromUserAsync(userId);
        return TypedResults.Ok(orders);
    }

    public static async Task<Ok<IEnumerable<CardType>>> GetCardTypesAsync(IOrderQueries orderQueries)
    {
        var cardTypes = await orderQueries.GetCardTypesAsync();
        return TypedResults.Ok(cardTypes);
    }

    // DEVELOPMENT NOTE — payment/checkout is INTENTIONALLY left undone for this project
    // (memory: project-marketplace-scope). Order creation is the checkout/payment entry
    // point; we deliberately don't build or e2e-test it here — the marketplace e2e covers
    // Catalog *content* only. The explicit throw makes the gap unmistakable rather than
    // silently half-working. To resume: restore the CreateOrder(Draft) handlers from git
    // history and re-enable the Basket cart writes (Basket.API/Apis/BasketApi.cs).
    public static Task<OrderDraftDTO> CreateOrderDraftAsync(
        CreateOrderDraftCommand command, [AsParameters] OrderServices services) =>
        throw PaymentLeftUndone();

    public static Task<Results<Ok, BadRequest<string>>> CreateOrderAsync(
        [FromHeader(Name = "x-requestid")] Guid requestId,
        CreateOrderRequest request,
        [AsParameters] OrderServices services) =>
        throw PaymentLeftUndone();

    private static NotImplementedException PaymentLeftUndone() =>
        new("Marketplace payment/checkout is intentionally left undone for this project " +
            "(Ordering order creation + Basket cart writes). The marketplace e2e covers " +
            "Catalog content only. See memory: project-marketplace-scope.");
}

public record CreateOrderRequest(
    string UserId,
    string UserName,
    string City,
    string Street,
    string State,
    string Country,
    string ZipCode,
    string CardNumber,
    string CardHolderName,
    DateTime CardExpiration,
    string CardSecurityNumber,
    int CardTypeId,
    string Buyer,
    List<BasketItem> Items);
