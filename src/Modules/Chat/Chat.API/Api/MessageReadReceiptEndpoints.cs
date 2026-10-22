namespace SocialLight.Chat.API.Api;

/// <summary>
/// HTTP endpoints for <c>MessageReadReceipt</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class MessageReadReceiptEndpoints
{
    public static IEndpointRouteBuilder MapMessageReadReceiptEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("MessageReadReceipts")
            .MapGroup("/api/message-read-receipts")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListMessageReadReceipts")
            .WithSummary("List messageReadReceipts")
            .WithTags("MessageReadReceipts");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetMessageReadReceipt")
            .WithSummary("Get a messageReadReceipt by id")
            .WithTags("MessageReadReceipts");

        api.MapPost("/", Create)
            .WithName("CreateMessageReadReceipt")
            .WithSummary("Create a messageReadReceipt")
            .WithTags("MessageReadReceipts");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteMessageReadReceipt")
            .WithSummary("Delete a messageReadReceipt")
            .WithTags("MessageReadReceipts");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<MessageReadReceiptDto>>> List(
        MessageReadReceiptService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<MessageReadReceiptDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<MessageReadReceiptDto>, NotFound>> GetById(
        Guid id, MessageReadReceiptService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<MessageReadReceiptDto>> Create(
        CreateMessageReadReceiptRequest request, MessageReadReceiptService service, CancellationToken cancellationToken)
    {
        var messageReadReceipt = await service.CreateAsync(
            request.MessageId,
            request.UserId,
            request.ReadAt,
            cancellationToken);

        var location = $"/api/message-read-receipts/{ messageReadReceipt.Id}";
        return TypedResults.Created(location, ToDto(messageReadReceipt));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, MessageReadReceiptService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static MessageReadReceiptDto ToDto(MessageReadReceipt e) => new(
        e.Id,
        e.MessageId,
        e.UserId,
        e.ReadAt
    );
}
