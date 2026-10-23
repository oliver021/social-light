namespace SocialLight.Events.API.Api;

/// <summary>
/// HTTP endpoints for <c>Event</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class EventEndpoints
{
    public static IEndpointRouteBuilder MapEventEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("Events")
            .MapGroup("/api/events")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListEvents")
            .WithSummary("List events")
            .WithTags("Events");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetEvent")
            .WithSummary("Get a event by id")
            .WithTags("Events");

        api.MapPost("/", Create)
            .WithName("CreateEvent")
            .WithSummary("Create a event")
            .WithTags("Events");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteEvent")
            .WithSummary("Delete a event")
            .WithTags("Events");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<EventDto>>> List(
        EventService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<EventDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<EventDto>, NotFound>> GetById(
        Guid id, EventService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<EventDto>> Create(
        CreateEventRequest request, EventService service, ClaimsPrincipal user, CancellationToken cancellationToken)
    {
        var organizerId = Guid.Parse(user.GetUserId() ?? throw new InvalidOperationException("Missing 'sub' claim"));
        var @event = await service.CreateAsync(
            organizerId,
            request.Title,
            request.Description,
            request.Location,
            request.StartDate,
            request.EndDate,
            request.Capacity,
            request.Visibility,
            cancellationToken);

        var location = $"/api/events/{ @event.Id}";
        return TypedResults.Created(location, ToDto(@event));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, EventService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static EventDto ToDto(Event e) => new(
        e.Id,
        e.OrganizerId,
        e.Title,
        e.Description,
        e.Location,
        e.StartDate,
        e.EndDate,
        e.Capacity,
        e.Visibility
    );
}
