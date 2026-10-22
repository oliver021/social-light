namespace SocialLight.Jobs.API.Api;

/// <summary>
/// HTTP endpoints for <c>JobPosition</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class JobPositionEndpoints
{
    public static IEndpointRouteBuilder MapJobPositionEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("JobPositions")
            .MapGroup("/api/job-positions")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListJobPositions")
            .WithSummary("List jobPositions")
            .WithTags("JobPositions");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetJobPosition")
            .WithSummary("Get a jobPosition by id")
            .WithTags("JobPositions");

        api.MapPost("/", Create)
            .WithName("CreateJobPosition")
            .WithSummary("Create a jobPosition")
            .WithTags("JobPositions");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteJobPosition")
            .WithSummary("Delete a jobPosition")
            .WithTags("JobPositions");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<JobPositionDto>>> List(
        JobPositionService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<JobPositionDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<JobPositionDto>, NotFound>> GetById(
        Guid id, JobPositionService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<JobPositionDto>> Create(
        CreateJobPositionRequest request, JobPositionService service, CancellationToken cancellationToken)
    {
        var jobPosition = await service.CreateAsync(
            request.JobCategoryId,
            request.OrganizationId,
            request.Title,
            request.Description,
            request.SalaryRange,
            request.Location,
            request.EmploymentType,
            cancellationToken);

        var location = $"/api/job-positions/{ jobPosition.Id}";
        return TypedResults.Created(location, ToDto(jobPosition));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, JobPositionService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static JobPositionDto ToDto(JobPosition e) => new(
        e.Id,
        e.JobCategoryId,
        e.OrganizationId,
        e.Title,
        e.Description,
        e.SalaryRange,
        e.Location,
        e.EmploymentType
    );
}
