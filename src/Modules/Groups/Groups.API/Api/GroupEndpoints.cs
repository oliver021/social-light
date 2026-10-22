namespace SocialLight.Groups.API.Api;

/// <summary>
/// HTTP endpoints for <c>Group</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class GroupEndpoints
{
    public static IEndpointRouteBuilder MapGroupEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Groups")
            .MapGroup("/api/groups")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListGroups")
            .WithSummary("List groups")
            .WithTags("Groups");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetGroup")
            .WithSummary("Get a group by id")
            .WithTags("Groups");

        api.MapPost("/", Create)
            .WithName("CreateGroup")
            .WithSummary("Create a group")
            .WithTags("Groups");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteGroup")
            .WithSummary("Delete a group")
            .WithTags("Groups");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<GroupDto>>> List(
        GroupService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<GroupDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<GroupDto>, NotFound>> GetById(
        Guid id, GroupService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<GroupDto>> Create(
        CreateGroupRequest request, GroupService service, CancellationToken cancellationToken)
    {
        var group = await service.CreateAsync(
            request.Name,
            request.Description,
            request.Avatar,
            request.CoverImage,
            request.PrivacyType,
            request.ApprovalRequired,
            cancellationToken);

        var location = $"/api/groups/{ group.Id}";
        return TypedResults.Created(location, ToDto(group));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, GroupService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static GroupDto ToDto(Group e) => new(
        e.Id,
        e.Name,
        e.Description,
        e.Avatar,
        e.CoverImage,
        e.PrivacyType,
        e.ApprovalRequired
    );
}
