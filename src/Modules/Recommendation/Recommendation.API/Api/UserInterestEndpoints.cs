namespace SocialLight.Recommendation.API.Api;

/// <summary>
/// HTTP endpoints for <c>UserInterest</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class UserInterestEndpoints
{
    public static IEndpointRouteBuilder MapUserInterestEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("UserInterests")
            .MapGroup("/api/user-interests")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListUserInterests")
            .WithSummary("List userInterests")
            .WithTags("UserInterests");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetUserInterest")
            .WithSummary("Get a userInterest by id")
            .WithTags("UserInterests");

        api.MapPost("/", Create)
            .WithName("CreateUserInterest")
            .WithSummary("Create a userInterest")
            .WithTags("UserInterests");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteUserInterest")
            .WithSummary("Delete a userInterest")
            .WithTags("UserInterests");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<UserInterestDto>>> List(
        UserInterestService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<UserInterestDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<UserInterestDto>, NotFound>> GetById(
        Guid id, UserInterestService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<UserInterestDto>> Create(
        CreateUserInterestRequest request, UserInterestService service, CancellationToken cancellationToken)
    {
        var userInterest = await service.CreateAsync(
            request.UserId,
            request.TopicId,
            request.Weight,
            cancellationToken);

        var location = $"/api/user-interests/{ userInterest.Id}";
        return TypedResults.Created(location, ToDto(userInterest));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, UserInterestService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static UserInterestDto ToDto(UserInterest e) => new(
        e.Id,
        e.UserId,
        e.TopicId,
        e.Weight
    );
}
