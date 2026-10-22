using socialLight.Posts.API.Infrastructure;
using socialLight.Posts.API.IntegrationEvents;

namespace socialLight.Posts.API.Apis;

// [AsParameters] DI bundle injected into the Posts endpoints (mirrors eShop's CatalogServices).
public class PostsServices(
    PostContext context,
    IPostIntegrationEventService eventService,
    ILogger<PostsServices> logger)
{
    public PostContext Context { get; } = context;
    public IPostIntegrationEventService EventService { get; } = eventService;
    public ILogger<PostsServices> Logger { get; } = logger;
}
