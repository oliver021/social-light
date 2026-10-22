namespace SocialLight.Moderation.API.Api;

/// <summary>
/// HTTP endpoints for <c>Appeal</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class AppealEndpoints
{
    public static IEndpointRouteBuilder MapAppealEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Appeals")
            .MapGroup("/api/appeals")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListAppeals")
            .WithSummary("List appeals")
            .WithTags("Appeals");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetAppeal")
            .WithSummary("Get a appeal by id")
            .WithTags("Appeals");

        api.MapPost("/", Create)
            .WithName("CreateAppeal")
            .WithSummary("Create a appeal")
            .WithTags("Appeals");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteAppeal")
            .WithSummary("Delete a appeal")
            .WithTags("Appeals");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<AppealDto>>> List(
        AppealService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<AppealDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<AppealDto>, NotFound>> GetById(
        Guid id, AppealService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<AppealDto>> Create(
        CreateAppealRequest request, AppealService service, CancellationToken cancellationToken)
    {
        var appeal = await service.CreateAsync(
            request.ModerationCaseId,
            request.AppellantId,
            request.Reason,
            request.Status,
            cancellationToken);

        var location = $"/api/appeals/{ appeal.Id}";
        return TypedResults.Created(location, ToDto(appeal));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, AppealService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static AppealDto ToDto(Appeal e) => new(
        e.Id,
        e.ModerationCaseId,
        e.AppellantId,
        e.Reason,
        e.Status
    );
}
