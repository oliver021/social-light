namespace SocialLight.Organizations.API.Api;

/// <summary>
/// HTTP endpoints for <c>OrganizationMember</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class OrganizationMemberEndpoints
{
    public static IEndpointRouteBuilder MapOrganizationMemberEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("OrganizationMembers")
            .MapGroup("/api/organization-members")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListOrganizationMembers")
            .WithSummary("List organizationMembers")
            .WithTags("OrganizationMembers");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetOrganizationMember")
            .WithSummary("Get a organizationMember by id")
            .WithTags("OrganizationMembers");

        api.MapPost("/", Create)
            .WithName("CreateOrganizationMember")
            .WithSummary("Create a organizationMember")
            .WithTags("OrganizationMembers");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteOrganizationMember")
            .WithSummary("Delete a organizationMember")
            .WithTags("OrganizationMembers");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<OrganizationMemberDto>>> List(
        OrganizationMemberService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<OrganizationMemberDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<OrganizationMemberDto>, NotFound>> GetById(
        Guid id, OrganizationMemberService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<OrganizationMemberDto>> Create(
        CreateOrganizationMemberRequest request, OrganizationMemberService service, CancellationToken cancellationToken)
    {
        var organizationMember = await service.CreateAsync(
            request.OrganizationId,
            request.UserId,
            request.Role,
            cancellationToken);

        var location = $"/api/organization-members/{ organizationMember.Id}";
        return TypedResults.Created(location, ToDto(organizationMember));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, OrganizationMemberService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static OrganizationMemberDto ToDto(OrganizationMember e) => new(
        e.Id,
        e.OrganizationId,
        e.UserId,
        e.Role
    );
}
