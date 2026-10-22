namespace SocialLight.Moderation.API.Api;

/// <summary>
/// HTTP endpoints for <c>ModerationCase</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ModerationCaseEndpoints
{
    public static IEndpointRouteBuilder MapModerationCaseEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("ModerationCases")
            .MapGroup("/api/moderation-cases")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListModerationCases")
            .WithSummary("List moderationCases")
            .WithTags("ModerationCases");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetModerationCase")
            .WithSummary("Get a moderationCase by id")
            .WithTags("ModerationCases");

        api.MapPost("/", Create)
            .WithName("CreateModerationCase")
            .WithSummary("Create a moderationCase")
            .WithTags("ModerationCases");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteModerationCase")
            .WithSummary("Delete a moderationCase")
            .WithTags("ModerationCases");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ModerationCaseDto>>> List(
        ModerationCaseService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ModerationCaseDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ModerationCaseDto>, NotFound>> GetById(
        Guid id, ModerationCaseService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ModerationCaseDto>> Create(
        CreateModerationCaseRequest request, ModerationCaseService service, CancellationToken cancellationToken)
    {
        var moderationCase = await service.CreateAsync(
            request.TargetType,
            request.TargetId,
            request.Status,
            request.OpenedAt,
            cancellationToken);

        var location = $"/api/moderation-cases/{ moderationCase.Id}";
        return TypedResults.Created(location, ToDto(moderationCase));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ModerationCaseService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ModerationCaseDto ToDto(ModerationCase e) => new(
        e.Id,
        e.TargetType,
        e.TargetId,
        e.Status,
        e.OpenedAt
    );
}
