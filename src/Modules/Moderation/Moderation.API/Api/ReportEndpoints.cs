namespace SocialLight.Moderation.API.Api;

/// <summary>
/// HTTP endpoints for <c>Report</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ReportEndpoints
{
    public static IEndpointRouteBuilder MapReportEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Reports")
            .MapGroup("/api/reports")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListReports")
            .WithSummary("List reports")
            .WithTags("Reports");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetReport")
            .WithSummary("Get a report by id")
            .WithTags("Reports");

        api.MapPost("/", Create)
            .WithName("CreateReport")
            .WithSummary("Create a report")
            .WithTags("Reports");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteReport")
            .WithSummary("Delete a report")
            .WithTags("Reports");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ReportDto>>> List(
        ReportService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ReportDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ReportDto>, NotFound>> GetById(
        Guid id, ReportService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ReportDto>> Create(
        CreateReportRequest request, ReportService service, CancellationToken cancellationToken)
    {
        var report = await service.CreateAsync(
            request.ReporterId,
            request.TargetType,
            request.TargetId,
            request.Category,
            request.Status,
            cancellationToken);

        var location = $"/api/reports/{ report.Id}";
        return TypedResults.Created(location, ToDto(report));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ReportService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ReportDto ToDto(Report e) => new(
        e.Id,
        e.ReporterId,
        e.TargetType,
        e.TargetId,
        e.Category,
        e.Status
    );
}
