using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using socialLight.Posts.API.Model;

namespace socialLight.Posts.API.Apis;

// Minimal-API endpoint group for Posts (Catalog-style slice).
public static class PostsApi
{
    public static IEndpointRouteBuilder MapPostsApi(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("api/posts")
                       .HasApiVersion(1.0);

        group.MapGet("/", GetPosts);
        group.MapGet("/{id}", GetPostById);
        group.MapPost("/", CreatePost);
        group.MapPut("/{id}", UpdatePost);
        group.MapDelete("/{id}", DeletePost);

        return app;
    }

    public static async Task<Ok<List<Post>>> GetPosts([AsParameters] PostsServices services)
    {
        var items = await services.Context.Posts.AsNoTracking().ToListAsync();
        return TypedResults.Ok(items);
    }

    public static async Task<Results<Ok<Post>, NotFound>> GetPostById(Guid id, [AsParameters] PostsServices services)
    {
        var item = await services.Context.Posts.FindAsync(id);
        return item is null ? TypedResults.NotFound() : TypedResults.Ok(item);
    }

    public static async Task<Created<Post>> CreatePost(CreatePostRequest request, [AsParameters] PostsServices services)
    {
        var entity = new Post
        {
            AuthorId = request.AuthorId,
            Content = request.Content,
            MediaUrl = request.MediaUrl,
            CreatedAt = request.CreatedAt,
        };

        services.Context.Posts.Add(entity);
        await services.Context.SaveChangesAsync();
        await services.EventService.PublishPostCreatedAsync(entity);
        return TypedResults.Created($"/api/posts/{entity.Id}", entity);
    }

    public static async Task<Results<Ok, NotFound>> UpdatePost(Guid id, UpdatePostRequest request, [AsParameters] PostsServices services)
    {
        var entity = await services.Context.Posts.FindAsync(id);
        if (entity is null) return TypedResults.NotFound();

        entity.AuthorId = request.AuthorId;
        entity.Content = request.Content;
        entity.MediaUrl = request.MediaUrl;
        entity.CreatedAt = request.CreatedAt;
        await services.Context.SaveChangesAsync();
        return TypedResults.Ok();
    }

    public static async Task<Results<NoContent, NotFound>> DeletePost(Guid id, [AsParameters] PostsServices services)
    {
        var entity = await services.Context.Posts.FindAsync(id);
        if (entity is null) return TypedResults.NotFound();

        services.Context.Posts.Remove(entity);
        await services.Context.SaveChangesAsync();
        return TypedResults.NoContent();
    }
}
