namespace SocialLight.Moderation.API.Api;

/// <summary>
/// HTTP endpoints for <c>ModerationNote</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ModerationNoteEndpoints
{
    public static IEndpointRouteBuilder MapModerationNoteEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("ModerationNotes")
            .MapGroup("/api/moderation-notes")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListModerationNotes")
            .WithSummary("List moderationNotes")
            .WithTags("ModerationNotes");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetModerationNote")
            .WithSummary("Get a moderationNote by id")
            .WithTags("ModerationNotes");

        api.MapPost("/", Create)
            .WithName("CreateModerationNote")
            .WithSummary("Create a moderationNote")
            .WithTags("ModerationNotes");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteModerationNote")
            .WithSummary("Delete a moderationNote")
            .WithTags("ModerationNotes");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ModerationNoteDto>>> List(
        ModerationNoteService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ModerationNoteDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ModerationNoteDto>, NotFound>> GetById(
        Guid id, ModerationNoteService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ModerationNoteDto>> Create(
        CreateModerationNoteRequest request, ModerationNoteService service, CancellationToken cancellationToken)
    {
        var moderationNote = await service.CreateAsync(
            request.ModerationCaseId,
            request.ModeratorId,
            request.Note,
            cancellationToken);

        var location = $"/api/moderation-notes/{ moderationNote.Id}";
        return TypedResults.Created(location, ToDto(moderationNote));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ModerationNoteService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ModerationNoteDto ToDto(ModerationNote e) => new(
        e.Id,
        e.ModerationCaseId,
        e.ModeratorId,
        e.Note
    );
}
