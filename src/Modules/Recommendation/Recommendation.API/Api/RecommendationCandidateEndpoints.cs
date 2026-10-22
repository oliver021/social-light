namespace SocialLight.Recommendation.API.Api;

/// <summary>
/// HTTP endpoints for <c>RecommendationCandidate</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class RecommendationCandidateEndpoints
{
    public static IEndpointRouteBuilder MapRecommendationCandidateEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("RecommendationCandidates")
            .MapGroup("/api/recommendation-candidates")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListRecommendationCandidates")
            .WithSummary("List recommendationCandidates")
            .WithTags("RecommendationCandidates");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetRecommendationCandidate")
            .WithSummary("Get a recommendationCandidate by id")
            .WithTags("RecommendationCandidates");

        api.MapPost("/", Create)
            .WithName("CreateRecommendationCandidate")
            .WithSummary("Create a recommendationCandidate")
            .WithTags("RecommendationCandidates");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteRecommendationCandidate")
            .WithSummary("Delete a recommendationCandidate")
            .WithTags("RecommendationCandidates");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<RecommendationCandidateDto>>> List(
        RecommendationCandidateService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<RecommendationCandidateDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<RecommendationCandidateDto>, NotFound>> GetById(
        Guid id, RecommendationCandidateService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<RecommendationCandidateDto>> Create(
        CreateRecommendationCandidateRequest request, RecommendationCandidateService service, CancellationToken cancellationToken)
    {
        var recommendationCandidate = await service.CreateAsync(
            request.UserId,
            request.TargetType,
            request.TargetId,
            request.Source,
            cancellationToken);

        var location = $"/api/recommendation-candidates/{ recommendationCandidate.Id}";
        return TypedResults.Created(location, ToDto(recommendationCandidate));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, RecommendationCandidateService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static RecommendationCandidateDto ToDto(RecommendationCandidate e) => new(
        e.Id,
        e.UserId,
        e.TargetType,
        e.TargetId,
        e.Source
    );
}
