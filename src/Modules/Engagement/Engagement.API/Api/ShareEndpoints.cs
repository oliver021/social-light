namespace SocialLight.Engagement.API.Api;

/// <summary>
/// HTTP endpoints for <c>Share</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ShareEndpoints
{
    public static IEndpointRouteBuilder MapShareEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Shares")
            .MapGroup("/api/shares")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListShares")
            .WithSummary("List shares")
            .WithTags("Shares");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetShare")
            .WithSummary("Get a share by id")
            .WithTags("Shares");

        api.MapPost("/", Create)
            .WithName("CreateShare")
            .WithSummary("Create a share")
            .WithTags("Shares");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteShare")
            .WithSummary("Delete a share")
            .WithTags("Shares");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ShareDto>>> List(
        ShareService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ShareDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ShareDto>, NotFound>> GetById(
        Guid id, ShareService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ShareDto>> Create(
        CreateShareRequest request, ShareService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var sharerId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var share = await service.CreateAsync(
            sharerId,
            request.TargetType,
            request.TargetId,
            request.Commentary,
            cancellationToken);

        var location = $"/api/shares/{ share.Id}";
        return TypedResults.Created(location, ToDto(share));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ShareService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ShareDto ToDto(Share e) => new(
        e.Id,
        e.SharerId,
        e.TargetType,
        e.TargetId,
        e.Commentary
    );
}
