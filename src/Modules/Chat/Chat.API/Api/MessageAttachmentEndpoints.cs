namespace SocialLight.Chat.API.Api;

/// <summary>
/// HTTP endpoints for <c>MessageAttachment</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class MessageAttachmentEndpoints
{
    public static IEndpointRouteBuilder MapMessageAttachmentEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("MessageAttachments")
            .MapGroup("/api/message-attachments")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListMessageAttachments")
            .WithSummary("List messageAttachments")
            .WithTags("MessageAttachments");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetMessageAttachment")
            .WithSummary("Get a messageAttachment by id")
            .WithTags("MessageAttachments");

        api.MapPost("/", Create)
            .WithName("CreateMessageAttachment")
            .WithSummary("Create a messageAttachment")
            .WithTags("MessageAttachments");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteMessageAttachment")
            .WithSummary("Delete a messageAttachment")
            .WithTags("MessageAttachments");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<MessageAttachmentDto>>> List(
        MessageAttachmentService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<MessageAttachmentDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<MessageAttachmentDto>, NotFound>> GetById(
        Guid id, MessageAttachmentService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<MessageAttachmentDto>> Create(
        CreateMessageAttachmentRequest request, MessageAttachmentService service, CancellationToken cancellationToken)
    {
        var messageAttachment = await service.CreateAsync(
            request.MessageId,
            request.FileUrl,
            request.MediaType,
            cancellationToken);

        var location = $"/api/message-attachments/{ messageAttachment.Id}";
        return TypedResults.Created(location, ToDto(messageAttachment));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, MessageAttachmentService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static MessageAttachmentDto ToDto(MessageAttachment e) => new(
        e.Id,
        e.MessageId,
        e.FileUrl,
        e.MediaType
    );
}
