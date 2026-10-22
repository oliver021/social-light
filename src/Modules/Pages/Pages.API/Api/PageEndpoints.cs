namespace SocialLight.Pages.API.Api;

/// <summary>
/// HTTP endpoints for <c>Page</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class PageEndpoints
{
    public static IEndpointRouteBuilder MapPageEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Pages")
            .MapGroup("/api/pages")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListPages")
            .WithSummary("List pages")
            .WithTags("Pages");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetPage")
            .WithSummary("Get a page by id")
            .WithTags("Pages");

        api.MapPost("/", Create)
            .WithName("CreatePage")
            .WithSummary("Create a page")
            .WithTags("Pages");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeletePage")
            .WithSummary("Delete a page")
            .WithTags("Pages");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<PageDto>>> List(
        PageService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<PageDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<PageDto>, NotFound>> GetById(
        Guid id, PageService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<PageDto>> Create(
        CreatePageRequest request, PageService service, CancellationToken cancellationToken)
    {
        var page = await service.CreateAsync(
            request.Name,
            request.Category,
            request.Description,
            request.Avatar,
            request.CoverImage,
            request.VerificationStatus,
            cancellationToken);

        var location = $"/api/pages/{ page.Id}";
        return TypedResults.Created(location, ToDto(page));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, PageService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static PageDto ToDto(Page e) => new(
        e.Id,
        e.Name,
        e.Category,
        e.Description,
        e.Avatar,
        e.CoverImage,
        e.VerificationStatus
    );
}
