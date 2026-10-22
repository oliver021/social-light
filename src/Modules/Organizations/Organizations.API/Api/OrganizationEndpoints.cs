namespace SocialLight.Organizations.API.Api;

/// <summary>
/// HTTP endpoints for <c>Organization</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class OrganizationEndpoints
{
    public static IEndpointRouteBuilder MapOrganizationEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Organizations")
            .MapGroup("/api/organizations")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListOrganizations")
            .WithSummary("List organizations")
            .WithTags("Organizations");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetOrganization")
            .WithSummary("Get a organization by id")
            .WithTags("Organizations");

        api.MapPost("/", Create)
            .WithName("CreateOrganization")
            .WithSummary("Create a organization")
            .WithTags("Organizations");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteOrganization")
            .WithSummary("Delete a organization")
            .WithTags("Organizations");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<OrganizationDto>>> List(
        OrganizationService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<OrganizationDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<OrganizationDto>, NotFound>> GetById(
        Guid id, OrganizationService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<OrganizationDto>> Create(
        CreateOrganizationRequest request, OrganizationService service, CancellationToken cancellationToken)
    {
        var organization = await service.CreateAsync(
            request.OwnerId,
            request.Name,
            request.Description,
            request.Logo,
            request.VerificationStatus,
            cancellationToken);

        var location = $"/api/organizations/{ organization.Id}";
        return TypedResults.Created(location, ToDto(organization));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, OrganizationService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static OrganizationDto ToDto(Organization e) => new(
        e.Id,
        e.OwnerId,
        e.Name,
        e.Description,
        e.Logo,
        e.VerificationStatus
    );
}
