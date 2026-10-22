namespace SocialLight.Jobs.API.Api;

/// <summary>
/// HTTP endpoints for <c>JobCategory</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class JobCategoryEndpoints
{
    public static IEndpointRouteBuilder MapJobCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("JobCategories")
            .MapGroup("/api/job-categories")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListJobCategories")
            .WithSummary("List jobCategories")
            .WithTags("JobCategories");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetJobCategory")
            .WithSummary("Get a jobCategory by id")
            .WithTags("JobCategories");

        api.MapPost("/", Create)
            .WithName("CreateJobCategory")
            .WithSummary("Create a jobCategory")
            .WithTags("JobCategories");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteJobCategory")
            .WithSummary("Delete a jobCategory")
            .WithTags("JobCategories");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<JobCategoryDto>>> List(
        JobCategoryService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<JobCategoryDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<JobCategoryDto>, NotFound>> GetById(
        Guid id, JobCategoryService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<JobCategoryDto>> Create(
        CreateJobCategoryRequest request, JobCategoryService service, CancellationToken cancellationToken)
    {
        var jobCategory = await service.CreateAsync(
            request.Name,
            cancellationToken);

        var location = $"/api/job-categories/{ jobCategory.Id}";
        return TypedResults.Created(location, ToDto(jobCategory));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, JobCategoryService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static JobCategoryDto ToDto(JobCategory e) => new(
        e.Id,
        e.Name
    );
}
