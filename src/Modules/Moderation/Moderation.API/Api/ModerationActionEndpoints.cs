namespace SocialLight.Moderation.API.Api;

/// <summary>
/// HTTP endpoints for <c>ModerationAction</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ModerationActionEndpoints
{
    public static IEndpointRouteBuilder MapModerationActionEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("ModerationActions")
            .MapGroup("/api/moderation-actions")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListModerationActions")
            .WithSummary("List moderationActions")
            .WithTags("ModerationActions");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetModerationAction")
            .WithSummary("Get a moderationAction by id")
            .WithTags("ModerationActions");

        api.MapPost("/", Create)
            .WithName("CreateModerationAction")
            .WithSummary("Create a moderationAction")
            .WithTags("ModerationActions");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteModerationAction")
            .WithSummary("Delete a moderationAction")
            .WithTags("ModerationActions");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ModerationActionDto>>> List(
        ModerationActionService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ModerationActionDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ModerationActionDto>, NotFound>> GetById(
        Guid id, ModerationActionService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ModerationActionDto>> Create(
        CreateModerationActionRequest request, ModerationActionService service, CancellationToken cancellationToken)
    {
        var moderationAction = await service.CreateAsync(
            request.ModerationCaseId,
            request.ModeratorId,
            request.ActionType,
            request.CreatedAt,
            cancellationToken);

        var location = $"/api/moderation-actions/{ moderationAction.Id}";
        return TypedResults.Created(location, ToDto(moderationAction));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ModerationActionService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ModerationActionDto ToDto(ModerationAction e) => new(
        e.Id,
        e.ModerationCaseId,
        e.ModeratorId,
        e.ActionType,
        e.CreatedAt
    );
}
