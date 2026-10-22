namespace SocialLight.Groups.API.Api;

/// <summary>
/// HTTP endpoints for <c>GroupMember</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class GroupMemberEndpoints
{
    public static IEndpointRouteBuilder MapGroupMemberEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("GroupMembers")
            .MapGroup("/api/group-members")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListGroupMembers")
            .WithSummary("List groupMembers")
            .WithTags("GroupMembers");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetGroupMember")
            .WithSummary("Get a groupMember by id")
            .WithTags("GroupMembers");

        api.MapPost("/", Create)
            .WithName("CreateGroupMember")
            .WithSummary("Create a groupMember")
            .WithTags("GroupMembers");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteGroupMember")
            .WithSummary("Delete a groupMember")
            .WithTags("GroupMembers");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<GroupMemberDto>>> List(
        GroupMemberService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<GroupMemberDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<GroupMemberDto>, NotFound>> GetById(
        Guid id, GroupMemberService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<GroupMemberDto>> Create(
        CreateGroupMemberRequest request, GroupMemberService service, CancellationToken cancellationToken)
    {
        var groupMember = await service.CreateAsync(
            request.GroupId,
            request.UserId,
            request.Role,
            cancellationToken);

        var location = $"/api/group-members/{ groupMember.Id}";
        return TypedResults.Created(location, ToDto(groupMember));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, GroupMemberService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static GroupMemberDto ToDto(GroupMember e) => new(
        e.Id,
        e.GroupId,
        e.UserId,
        e.Role
    );
}
