namespace SocialLight.Engagement.API.Api;

/// <summary>
/// HTTP endpoints for <c>Reaction</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class ReactionEndpoints
{
    public static IEndpointRouteBuilder MapReactionEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Reactions")
            .MapGroup("/api/reactions")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListReactions")
            .WithSummary("List reactions")
            .WithTags("Reactions");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetReaction")
            .WithSummary("Get a reaction by id")
            .WithTags("Reactions");

        api.MapPost("/", Create)
            .WithName("CreateReaction")
            .WithSummary("Create a reaction")
            .WithTags("Reactions");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteReaction")
            .WithSummary("Delete a reaction")
            .WithTags("Reactions");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<ReactionDto>>> List(
        ReactionService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<ReactionDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<ReactionDto>, NotFound>> GetById(
        Guid id, ReactionService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<ReactionDto>> Create(
        CreateReactionRequest request, ReactionService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var userId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var reaction = await service.CreateAsync(
            userId,
            request.TargetType,
            request.TargetId,
            request.ReactionType,
            cancellationToken);

        var location = $"/api/reactions/{ reaction.Id}";
        return TypedResults.Created(location, ToDto(reaction));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, ReactionService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static ReactionDto ToDto(Reaction e) => new(
        e.Id,
        e.UserId,
        e.TargetType,
        e.TargetId,
        e.ReactionType
    );
}
