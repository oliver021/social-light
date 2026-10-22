namespace SocialLight.Events.API.Api;

/// <summary>
/// HTTP endpoints for <c>EventAttendance</c> — minimal APIs with versioning + OpenAPI
/// metadata (CLAUDE.md §4.2). The endpoints map domain ⇄ DTO so the aggregate
/// never leaks across the wire; the service holds the behavior.
/// </summary>
public static class EventAttendanceEndpoints
{
    public static IEndpointRouteBuilder MapEventAttendanceEndpoints(this IEndpointRouteBuilder app)
    {
        var api = app.NewVersionedApi("EventAttendances")
            .MapGroup("/api/event-attendances")
            .HasApiVersion(1, 0);

        // Every endpoint in this module requires an authenticated caller; the host
        // binds the JWT scheme (ServiceDefaults AddDefaultAuthentication). Writes
        // additionally bind the owner from the principal — never the request body.
        api.RequireAuthorization();

        api.MapGet("/", List)
            .WithName("ListEventAttendances")
            .WithSummary("List eventAttendances")
            .WithTags("EventAttendances");

        api.MapGet("/{id:guid}", GetById)
            .WithName("GetEventAttendance")
            .WithSummary("Get a eventAttendance by id")
            .WithTags("EventAttendances");

        api.MapPost("/", Create)
            .WithName("CreateEventAttendance")
            .WithSummary("Create a eventAttendance")
            .WithTags("EventAttendances");

        api.MapDelete("/{id:guid}", Delete)
            .WithName("DeleteEventAttendance")
            .WithSummary("Delete a eventAttendance")
            .WithTags("EventAttendances");

        return app;
    }

    public static async Task<Ok<IReadOnlyList<EventAttendanceDto>>> List(
        EventAttendanceService service, CancellationToken cancellationToken)
    {
        var items = await service.ListAsync(cancellationToken);
        return TypedResults.Ok<IReadOnlyList<EventAttendanceDto>>([.. items.Select(ToDto)]);
    }

    public static async Task<Results<Ok<EventAttendanceDto>, NotFound>> GetById(
        Guid id, EventAttendanceService service, CancellationToken cancellationToken)
    {
        var item = await service.GetAsync(id, cancellationToken);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(ToDto(item));
    }

    public static async Task<Created<EventAttendanceDto>> Create(
        CreateEventAttendanceRequest request, EventAttendanceService service, CancellationToken cancellationToken)
    {
        var eventAttendance = await service.CreateAsync(
            request.EventId,
            request.UserId,
            request.Status,
            cancellationToken);

        var location = $"/api/event-attendances/{ eventAttendance.Id}";
        return TypedResults.Created(location, ToDto(eventAttendance));
    }

    public static async Task<Results<NoContent, NotFound>> Delete(
        Guid id, EventAttendanceService service, CancellationToken cancellationToken)
        => await service.DeleteAsync(id, cancellationToken)
            ? TypedResults.NoContent()
            : TypedResults.NotFound();

    private static EventAttendanceDto ToDto(EventAttendance e) => new(
        e.Id,
        e.EventId,
        e.UserId,
        e.Status
    );
}
