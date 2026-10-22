namespace SocialLight.Gaming.API.Api;

/// <summary>
/// HTTP endpoints for <c>TeamMember</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class TeamMemberEndpoints
{
    public static IEndpointRouteBuilder MapTeamMemberEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("TeamMembers")
            .MapGroup("/api/team-members")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListTeamMembers")
            .WithSummary("List teamMembers")
            .WithTags("TeamMembers");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetTeamMember")
            .WithSummary("Get a teamMember by id")
            .WithTags("TeamMembers");

        api.MapPost("/", Create)
            .WithName("CreateTeamMember")
            .WithSummary("Create a teamMember")
            .WithTags("TeamMembers");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteTeamMember")
            .WithSummary("Delete a teamMember")
            .WithTags("TeamMembers");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<TeamMemberDto>>> List(
        TeamMemberService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<TeamMemberDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<TeamMemberDto>, NotFound>> GetById(
        Guid id, TeamMemberService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<TeamMemberDto>> Create(
        CreateTeamMemberRequest request, TeamMemberService service, CancellationToken cancellationToken)
    {
        var teamMember = await service.CreateAsync(
            request.TeamId,
            request.UserId,
            request.Role,
            cancellationToken);

        var location = $"/api/team-members/{ teamMember.Id}";
        return TypedResults.Created(location, ToDto(teamMember));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, TeamMemberService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static TeamMemberDto ToDto(TeamMember e) => new(
        e.Id,
        e.TeamId,
        e.UserId,
        e.Role
    );
}
