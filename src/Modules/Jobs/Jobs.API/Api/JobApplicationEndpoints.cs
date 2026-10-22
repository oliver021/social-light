namespace SocialLight.Jobs.API.Api;

/// <summary>
/// HTTP endpoints for <c>JobApplication</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class JobApplicationEndpoints
{
    public static IEndpointRouteBuilder MapJobApplicationEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("JobApplications")
            .MapGroup("/api/job-applications")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListJobApplications")
            .WithSummary("List jobApplications")
            .WithTags("JobApplications");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetJobApplication")
            .WithSummary("Get a jobApplication by id")
            .WithTags("JobApplications");

        api.MapPost("/", Create)
            .WithName("CreateJobApplication")
            .WithSummary("Create a jobApplication")
            .WithTags("JobApplications");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteJobApplication")
            .WithSummary("Delete a jobApplication")
            .WithTags("JobApplications");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<JobApplicationDto>>> List(
        JobApplicationService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<JobApplicationDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<JobApplicationDto>, NotFound>> GetById(
        Guid id, JobApplicationService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<JobApplicationDto>> Create(
        CreateJobApplicationRequest request, JobApplicationService service, CancellationToken cancellationToken)
    {
        var jobApplication = await service.CreateAsync(
            request.ApplicantId,
            request.JobPositionId,
            request.ResumeId,
            request.CoverLetter,
            request.Status,
            cancellationToken);

        var location = $"/api/job-applications/{ jobApplication.Id}";
        return TypedResults.Created(location, ToDto(jobApplication));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, JobApplicationService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static JobApplicationDto ToDto(JobApplication e) => new(
        e.Id,
        e.ApplicantId,
        e.JobPositionId,
        e.ResumeId,
        e.CoverLetter,
        e.Status
    );
}
