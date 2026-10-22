namespace SocialLight.Pages.API.Api;

/// <summary>
/// HTTP endpoints for <c>PageRole</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class PageRoleEndpoints
{
    public static IEndpointRouteBuilder MapPageRoleEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("PageRoles")
            .MapGroup("/api/page-roles")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListPageRoles")
            .WithSummary("List pageRoles")
            .WithTags("PageRoles");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetPageRole")
            .WithSummary("Get a pageRole by id")
            .WithTags("PageRoles");

        api.MapPost("/", Create)
            .WithName("CreatePageRole")
            .WithSummary("Create a pageRole")
            .WithTags("PageRoles");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeletePageRole")
            .WithSummary("Delete a pageRole")
            .WithTags("PageRoles");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<PageRoleDto>>> List(
        PageRoleService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<PageRoleDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<PageRoleDto>, NotFound>> GetById(
        Guid id, PageRoleService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<PageRoleDto>> Create(
        CreatePageRoleRequest request, PageRoleService service, CancellationToken cancellationToken)
    {
        var pageRole = await service.CreateAsync(
            request.PageId,
            request.UserId,
            request.Role,
            cancellationToken);

        var location = $"/api/page-roles/{ pageRole.Id}";
        return TypedResults.Created(location, ToDto(pageRole));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, PageRoleService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static PageRoleDto ToDto(PageRole e) => new(
        e.Id,
        e.PageId,
        e.UserId,
        e.Role
    );
}
