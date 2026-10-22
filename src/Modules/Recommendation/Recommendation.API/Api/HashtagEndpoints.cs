namespace SocialLight.Recommendation.API.Api;

/// <summary>
/// HTTP endpoints for <c>Hashtag</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class HashtagEndpoints
{
    public static IEndpointRouteBuilder MapHashtagEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Hashtags")
            .MapGroup("/api/hashtags")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListHashtags")
            .WithSummary("List hashtags")
            .WithTags("Hashtags");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetHashtag")
            .WithSummary("Get a hashtag by id")
            .WithTags("Hashtags");

        api.MapPost("/", Create)
            .WithName("CreateHashtag")
            .WithSummary("Create a hashtag")
            .WithTags("Hashtags");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteHashtag")
            .WithSummary("Delete a hashtag")
            .WithTags("Hashtags");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<HashtagDto>>> List(
        HashtagService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<HashtagDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<HashtagDto>, NotFound>> GetById(
        Guid id, HashtagService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<HashtagDto>> Create(
        CreateHashtagRequest request, HashtagService service, CancellationToken cancellationToken)
    {
        var hashtag = await service.CreateAsync(
            request.Tag,
            cancellationToken);

        var location = $"/api/hashtags/{ hashtag.Id}";
        return TypedResults.Created(location, ToDto(hashtag));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, HashtagService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static HashtagDto ToDto(Hashtag e) => new(
        e.Id,
        e.Tag
    );
}
